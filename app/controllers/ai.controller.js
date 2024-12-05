const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const AWS = require("aws-sdk");
const path = require("path");
const { queue } = require('../helpers/queue.js')
const checkFolderExists = require('../helpers/checkFolderExistsS3.js')


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
                [jobID, getUserID, false, 'open-ai','failed',getCurrentDateTime()]
            );

            return res.json({ status: 422, msg: "Zip not processed uccessfully or invalid" });
        }


        const response = await queue.add('myJob', {
            jobID: jobID
        });

        // saving Job details in db
        let dataFromDb
        if (response.id) {
          dataFromDb = await pool.query(
            `INSERT INTO jobs (job_id,user_id,upload_status,job_type,job_status) VALUES ($1,$2,$3,$4,$5)`,
            [jobID, getUserID, true, "open-ai",'pending']
          );
        }
        res.json({ status: 200, msg: "Job Added Auccessfully" });
    } catch (err) {
        console.error("Error Uploading Attachments", err);

        res.json({ status: 0, msg: "Internal Server Error" });
    }
};

module.exports = aiController;