const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const AWS = require("aws-sdk");
const path = require("path");
const { queue } = require('../helpers/queue.js')
const checkFolderExists = require('../helpers/checkFolderExistsS3.js')
const textractHelper = require("../helpers/textract.helper.js");
const openAIHelper = require("../helpers/openai.helper.js");


// AWS Config
AWS.config.update({
    accessKeyId: process.env.BUCKET_KEY,
    secretAccessKey: process.env.BUCKET_SECRET,
    region: process.env.BUCKET_REGION,
});

// Initializing S3
const s3 = new AWS.S3({
    region: process.env.BUCKET_REGION
});

const aiController = {};

const getCurrentDateTime = () => {
    const timeStamp = moment().format("DD/MM/YYYY hh:mm:ss A");
    return timeStamp;
};

aiController.addNewJob = async (req, res) => {
    try {
        // let token = req.session.token;
        const { jobID } = req.body;
        if (!jobID) {
            return res.json({ status: 400, msg: "no jobID found" });
        }
        const params = {
            Bucket: process.env.BUCKET_NAME,
            key: "unzipped_uploads/",
        };

        // adding new job to que
        const getUserID = jobID.split("_")[1]

        // checking File exists s3 Bucket
        const exists = await checkFolderExists(s3, params.Bucket, (params.key + jobID));

        if (!exists) {
            await pool.query(
                `INSERT INTO jobs (job_id,user_id,upload_status,job_type,job_status,started_at) VALUES ($1,$2,$3,$4,$5,$6)`,
                [jobID, getUserID, false, 'open-ai', 'failed', getCurrentDateTime()]
            );

            return res.json({ status: 400, msg: "Zip not processed uccessfully or invalid" });
        }


        const response = await queue.add('myJob', {
            jobID: jobID
        });

        // saving Job details in db
        let dataFromDb
        if (response.id) {
            dataFromDb = await pool.query(
                `INSERT INTO jobs (job_id,user_id,upload_status,job_type,job_status) VALUES ($1,$2,$3,$4,$5)`,
                [jobID, getUserID, true, "open-ai", 'pending']
            );
        }
        res.json({ status: 200, msg: "Job Added Auccessfully" });
    } catch (err) {
        console.error("Error Uploading Attachments", err);

        res.json({ status: 0, msg: "Internal Server Error", err: err });
    }
};

aiController.processSingleFile = async (req, res) => {
    let { siteId } = req.body;
    let token = req.session.token;
    if (!token) {
        return res.send({ status: 0, msg: "user not logged IN" });
    }

    if (!req.file) {
        return res.send({ status: 0, msg: "No file uploaded" });
    }
    const fileName = uuidv4();
    try {
        const s3Params = {
            Bucket: "spsinglabucket",
            Key: `docs/${fileName}.pdf`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        const s3Response = await s3.upload(s3Params).promise();
        const pdfLocation = s3Response.Location;


        let textractData = await textractHelper("spsinglabucket", s3Response.Key, true);
        let extractData = await openAIHelper(textractData.textractResult);
        let extractedOpenAIData = JSON.parse(extractData.choices[0].message.content);

        if (!extractedOpenAIData) {
            return res.send({ status: 0, msg: "No AI Response" });
        }

        let siteCode = siteId;
        let { rows: userDataFromDb } = await pool.query(`SELECT user_name FROM users WHERE user_id = $1`, [token.user_id]);
        let { rows: siteDataFromDb } = await pool.query(`SELECT * FROM sites WHERE site_id = $1`, [siteCode]);
        let { rows: parentSiteFromDb } = await pool.query(`SELECT * FROM sites WHERE site_id = ${siteDataFromDb[0].site_parent_id}`);

        let document = {};

        document.doc_number = extractedOpenAIData.letter_number;
        document.doc_type = extractedOpenAIData.letter_number.includes("SPS/") ? "OUTGOING" : "INCOMING";
        document.doc_reference = extractedOpenAIData.references.replace(/\s+/g, "");
        document.doc_created_at = extractedOpenAIData.date;
        document.doc_subject = extractedOpenAIData.subject;
        document.doc_source = "AI IMPORT";
        document.doc_uploaded_at = moment().format("MM/DD/YYYY");
        document.doc_status = "UPLOADED";
        document.doc_site = parentSiteFromDb[0].site_name;
        document.doc_folder = siteDataFromDb[0].site_name;
        document.doc_uploaded_by_id = token.user_id;
        document.doc_uploaded_by = userDataFromDb[0].user_name;
        document.doc_pdf_link = pdfLocation;
        document.doc_ocr_status = false;

        await pool.query(
            `INSERT INTO documents (
                doc_number, doc_type, doc_reference, doc_created_at, doc_subject, doc_source, doc_uploaded_at, doc_status, doc_site, doc_folder, doc_uploaded_by_id, doc_uploaded_by, doc_pdf_link, doc_ocr_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (doc_number) 
            DO UPDATE SET 
                doc_type = EXCLUDED.doc_type,
                doc_reference = EXCLUDED.doc_reference,
                doc_created_at = EXCLUDED.doc_created_at,
                doc_subject = EXCLUDED.doc_subject,
                doc_source = EXCLUDED.doc_source,
                doc_uploaded_at = EXCLUDED.doc_uploaded_at,
                doc_status = EXCLUDED.doc_status,
                doc_site = EXCLUDED.doc_site,
                doc_folder = EXCLUDED.doc_folder,
                doc_uploaded_by_id = EXCLUDED.doc_uploaded_by_id,
                doc_uploaded_by = EXCLUDED.doc_uploaded_by,
                doc_pdf_link = EXCLUDED.doc_pdf_link,
                doc_ocr_status = EXCLUDED.doc_ocr_status;`,
            [document.doc_number, document.doc_type, document.doc_reference, document.doc_created_at, document.doc_subject, document.doc_source, document.doc_uploaded_at, document.doc_status, document.doc_site, document.doc_folder, document.doc_uploaded_by_id, document.doc_uploaded_by, document.doc_pdf_link, document.doc_ocr_status]
        );

        const { rows: documentData } = await pool.query(
            `SELECT doc_folder, doc_site FROM documents WHERE doc_number = $1;`,
            [document.doc_number]
        );


        const { doc_folder, doc_site } = documentData[0];

        await pool.query(
            `
            INSERT INTO doc_stats (doc_folder, doc_site, doc_total_pages, doc_total_doc) 
            VALUES ($1, $2, $3, 1) 
            ON CONFLICT (doc_folder) 
            DO UPDATE SET 
              doc_total_pages = doc_stats.doc_total_pages + EXCLUDED.doc_total_pages,
              doc_total_doc = doc_stats.doc_total_doc + 1;
            `,
            [doc_folder, doc_site, textractData.totalPagesProcessed]
        );

        await pool.query(
            `
            INSERT INTO folder_stats (doc_folder_name, doc_folder_id, last_updated) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (doc_folder_name) 
            DO UPDATE SET
              last_updated = EXCLUDED.last_updated,
              doc_folder_id = EXCLUDED.doc_folder_id;
            `,
            [doc_folder, siteId, getCurrentDateTime()]
        );


        // ADDING HISTORY
        await pool.query(`INSERT INTO doc_history_junction (dhj_doc_number, dhj_history_type, dhj_timestamp,dhj_history_blame,dhj_history_blame_user) VALUES ($1,$2,$3,$4,$5)`, [extractedOpenAIData.letter_number, "UPLOADED", moment().format("MM/DD/YYYY HH:mm:ss"), token.user_id, userDataFromDb[0].user_name]);

        console.log("Document processed and inserted successfully");

        return res.send({ status: 1, msg: "File Processed Successfully" });
    } catch (error) {
        console.log(error);
        return res.send({ status: 0, msg: "error" });
    }
}

module.exports = aiController;