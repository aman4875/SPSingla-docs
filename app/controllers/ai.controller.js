"use strict";
const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const AWS = require("aws-sdk");
const path = require("path");
const { queue } = require('../helpers/queue.js')
const checkFolderExists = require('../helpers/checkFolderExistsS3.js')
const textractHelper = require("../helpers/textract.helper.js");
const openAIHelper = require("../helpers/openai.helper.js");
const checkFolderType = require("../helpers/checkFolderType.js")
const generateAlphaNumericSuffix = require('../utils/generateRandomAlphanumeric.js')
const parseSubject = require('../utils/parseSubject.js')
const updateFailedStatus = require('../helpers/updateFailedStatus.js')
const validateAIResponse = require('../helpers/valiDateAIResponse.js')


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
        console.log("🚀 ~ aiController.addNewJob= ~ exists:", exists)

        if (!exists.folderExists || !exists.filesExist) {
            await pool.query(
                `INSERT INTO jobs (job_id,user_id,upload_status,job_type,job_status,started_at,feed) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [jobID, getUserID, false, 'open-ai', 'failed', getCurrentDateTime(), "File or Folder Don't Exists In S3 Aws"]
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
                `INSERT INTO jobs (job_id,user_id,upload_status,job_type,job_status,started_at) VALUES ($1,$2,$3,$4,$5,$6)`,
                [jobID, getUserID, true, "open-ai", 'pending', getCurrentDateTime()]
            );
        }
        res.json({ status: 200, msg: "Job Added Auccessfully" });
    } catch (err) {
        console.error("Error Uploading Attachments", err);

        res.json({ status: 0, msg: "Internal Server Error", err: err });
    }
};

aiController.processSingleFile = async (req, res) => {
    let { siteId, name } = req.body;
    let token = req.session.token;

    let { rows: siteDataFromDb } = await pool.query(`SELECT * FROM sites WHERE site_id = $1`, [siteId]);


    if (!token) {
        return res.send({ status: 0, msg: "user not logged IN" });
    }

    if (!req.file) {
        return res.send({ status: 0, msg: "No file uploaded" });
    }
    const fileName = uuidv4();
    try {
        const s3Params = {
            Bucket: process.env.BUCKET_NAME,
            Key: `docs/${fileName}.pdf`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        const s3Response = await s3.upload(s3Params).promise();
        const pdfLocation = s3Response.Location;


        let textractData = await textractHelper(process.env.BUCKET_NAME, s3Response.Key, true);
        if (!textractData.textractResult || textractData.textractResult === 'undefined') {
            await updateFailedStatus(name, s3, "Unsupported file type", s3Response.Key, token.user_id)
            return res.send({ status: 0, msg: "Unsupported file type" });
        }
        let extractData = await openAIHelper(textractData.textractResult);
        let extractedOpenAIData = validateAIResponse(JSON.parse(extractData?.choices && extractData?.choices[0]?.message?.content));

        if (!extractedOpenAIData) {
            await updateFailedStatus(name, s3, "No AI Response", s3Response.Key, token.user_id)
            return res.send({ status: 0, msg: "No AI Response" });
        }

        let siteCode = siteId;
        let { rows: userDataFromDb } = await pool.query(`SELECT user_name FROM users WHERE user_id = $1`, [token.user_id]);
        let { rows: siteDataFromDb } = await pool.query(`SELECT * FROM sites WHERE site_id = $1`, [siteCode]);
        let { rows: parentSiteFromDb } = await pool.query(`SELECT * FROM sites WHERE site_id = ${siteDataFromDb[0].site_parent_id}`);

        let document = {};

        document.doc_number = extractedOpenAIData.letter_number && extractedOpenAIData?.letter_number?.replace(/\s+/g, "");
        document.doc_type = checkFolderType(siteDataFromDb[0].site_name, extractedOpenAIData.letter_number);
        document.doc_reference = extractedOpenAIData.references && extractedOpenAIData?.references?.replace(/\s+/g, "");
        document.doc_created_at = extractedOpenAIData.date;
        document.doc_subject = parseSubject(extractedOpenAIData.subject);
        document.doc_source = "AI IMPORT";
        document.doc_uploaded_at = moment().format("MM/DD/YYYY");
        document.doc_status = "UPLOADED";
        document.doc_site = parentSiteFromDb[0].site_name;
        document.doc_folder = siteDataFromDb[0].site_name;
        document.doc_uploaded_by_id = token.user_id;
        document.doc_uploaded_by = userDataFromDb[0].user_name;
        document.doc_pdf_link = pdfLocation;
        document.doc_ocr_status = false;

        // Check if the document exists in the database
        let { rows: matchedDoc } = await pool.query(
            `SELECT COUNT(*) AS count 
             FROM documents 
             WHERE REPLACE(doc_number, ' ', '') = $1`,
            [extractedOpenAIData?.letter_number?.replace(/\s+/g, "")]
        );

        if (matchedDoc[0]?.count > 0) {
            console.log('found mached doc_number');

            let isUnique = false;
            let uniqueDocNumber
            while (!isUnique) {
                const randomSuffix = generateAlphaNumericSuffix();
                uniqueDocNumber = `${document.doc_number}-${randomSuffix}`;

                // Check if this doc_number already exists in the database
                let { rows } = await pool.query(
                    `SELECT COUNT(*) AS count FROM documents WHERE doc_number = $1`,
                    [uniqueDocNumber]
                );

                // If no matching record is found, it is unique
                if (parseInt(rows[0]?.count) === 0) {
                    isUnique = true;
                }
            }
            document.doc_number = uniqueDocNumber;
        }

        await pool.query(
            `INSERT INTO documents (
						doc_number, doc_type, doc_reference, doc_created_at, doc_subject, doc_source, doc_uploaded_at, doc_status, doc_site, doc_folder, doc_uploaded_by_id, doc_uploaded_by, doc_pdf_link, doc_ocr_status
					) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                document.doc_number, document.doc_type, document.doc_reference, document.doc_created_at, document.doc_subject, document.doc_source, document.doc_uploaded_at, document.doc_status, document.doc_site, document.doc_folder, document.doc_uploaded_by_id, document.doc_uploaded_by, document.doc_pdf_link, document.doc_ocr_status
            ]
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


        return res.send({ status: 1, msg: "File Processed Successfully" });
    } catch (error) {
        console.log(error);
        await updateFailedStatus(name, s3, "Failed to process pdf", "", token.user_id)
        return res.send({ status: 0, msg: "error" });
    }
}

module.exports = aiController;