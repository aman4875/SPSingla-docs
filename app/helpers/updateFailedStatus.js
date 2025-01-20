const { pool } = require("./database.helper.js");
const getCurrentDateTime = require('../utils/getCurrentDateTime.js')
const moment = require('moment')

const updateFailedStatus = async (fileName, s3, message, fileKey, user_id) => {
    const newFileKey = `${moment().unix()}-${fileName}`;

    await pool.query(
        `INSERT INTO failed_job_stats (flagged, feed, status, end_at, failed_pdf,job_status,user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7 )`,
        [
            true,
            message,
            "processing pdf failed",
            getCurrentDateTime(),
            newFileKey,
            "failed",
            user_id,
        ]
    );

}

module.exports = updateFailedStatus