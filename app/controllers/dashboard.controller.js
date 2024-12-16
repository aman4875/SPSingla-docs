const { pool } = require("../helpers/database.helper.js");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const AWS = require("aws-sdk");
const path = require("path");
const { queue } = require('../helpers/queue.js')
const getCurrentDateTime = require('../utils/getCurrentDateTime.js')



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

const dashboardController = {};



dashboardController.documentStatus = async (req, res) => {
    try {
        let token = req.session.token;
        const { jobID } = req.body;
        if (!token) {
            return res.json({ status: 400, msg: "User not logged In" });
        }
        let siteQuery, folderQuery, countfolders;
        if (token.user_role === "0") {
            siteQuery = `SELECT * FROM sites WHERE site_parent_id = 0`;
            folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name,
                fs.last_updated
                FROM sites s
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                LEFT JOIN folder_stats fs ON fs.doc_folder_id = s.site_id
                WHERE s.site_parent_id != 0
                ORDER BY s.site_name`;
        } else {
            siteQuery = `
                SELECT s.*
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                WHERE usj.usj_user_id = ${token.user_id} AND site_parent_id = 0
            `;
            folderQuery = `
                SELECT s.*, sp.site_name as site_parent_name,
                fs.last_updated
                FROM sites s
                JOIN users_sites_junction usj ON s.site_id = usj.usj_site_id
                LEFT JOIN sites sp ON s.site_parent_id = sp.site_id
                LEFT JOIN folder_stats fs on fs.doc_folder_id = s.site_id
                WHERE usj.usj_user_id = ${token.user_id} AND s.site_parent_id != 0
                ORDER BY s.site_name
            `;
        }


        let siteFromDb = await pool.query(siteQuery);
        let folderFromDb = await pool.query(folderQuery);

        const siteNames = folderFromDb.rows.map(row => `'${row.site_name}'`);
        const siteNamesString = siteNames.join(', ');
        
        
        countfolders = `SELECT doc_folder, COUNT(*) AS count
        FROM documents AS d
        WHERE doc_folder IN (${siteNamesString})
        GROUP BY doc_folder`; 

        let folderCount = await pool.query(countfolders);
        let sites = siteFromDb.rows;
        let folders = folderFromDb.rows;
        const folderWithCount = folders.map((folder)=>{
             return{
                ...folder,
                doc_count: folderCount.rows.filter(count => count.doc_folder === folder.site_name)[0]
             }
        })
        // Combine sites and folders
        let response = sites.map((site) => {
            return {
                ...site,
                folders: folderWithCount.filter(folder => folder.site_parent_id === site.site_id)
            };
        });

        return res.json({ status: 1, data: response });

    } catch (err) {
        console.error("Error Uploading Attachments", err);
        return res.json({ status: 0, msg: "Internal Server Error", err: err });
    }
};


module.exports = dashboardController;