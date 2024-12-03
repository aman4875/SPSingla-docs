const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const AWS = require("aws-sdk");
const path = require("path");
const { queue } = require('../helpers/queue.js')


// AWS Config
AWS.config.update({
    accessKeyId: process.env.BUCKET_KEY,
    secretAccessKey: process.env.BUCKET_SECRET,
    region: process.env.BUCKET_REGION,
});

// Initializing S3
const s3 = new AWS.S3({
    region:process.env.BUCKET_REGION
});

const aiController = {};



aiController.addNewJob = async (req, res) => {
    try {
        const { jobID } = req.body;
        // let token = req.session.token;

        // adding new job to que
        const getUserID = jobID.split("_")[1]
        const response = await queue.add('myJob', {
            jobID: jobID
        });

        // saving Job details in db
        let dataFromDb
        if (response.id) {
            dataFromDb = await pool.query(`INSERT INTO jobs (job_id,user_id,upload_status) VALUES ($1,$2,$3)`, [jobID, getUserID, true]);
        }


        res.json({ status: 200, msg: "Job Added Auccessfully" });
    } catch (err) {
        console.error("Error Uploading Attachments", err);

        res.json({ status: 0, msg: "Internal Server Error" });
    }
};

module.exports = aiController;