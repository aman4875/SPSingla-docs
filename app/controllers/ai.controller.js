const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const AWS = require("aws-sdk");
const path = require("path");

// AWS Config
AWS.config.update({
    accessKeyId: process.env.BUCKET_KEY,
    secretAccessKey: process.env.BUCKET_SECRET,
    region: process.env.BUCKET_REGION,
});

// Initializing S3
const s3 = new AWS.S3();

const aiController = {};



aiController.addNewJob = async (req, res) => {
    try {
        const { jobID } = req.body;
        // let token = req.session.token;
        console.log(jobID);
        

        let dataFromDb = await pool.query(`INSERT INTO jobs (new_jobs) VALUES ($1)`, [jobID]);

        
        res.json({ status: 0, msg: "hellosdddd" });
    } catch (err) {
        console.error("Error Uploading Attachments", err);
        res.json({ status: 0, msg: "Internal Server Error" });
    }
};

module.exports = aiController;
