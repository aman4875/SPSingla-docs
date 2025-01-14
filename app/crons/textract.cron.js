const { pool } = require("../helpers/database.helper");
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const moment = require('moment');
const AWS = require('aws-sdk');
const dotenv = require("dotenv").config();
const getElapsedMinutes = require('../utils/getElapsedMinutes')

// AWS Config 
AWS.config.update({
    accessKeyId: process.env.BUCKET_KEY,
    secretAccessKey: process.env.BUCKET_SECRET,
    region: process.env.BUCKET_REGION,
});


// Initializing S3
const s3 = new AWS.S3();

// Initializing Textract
const textract = new AWS.Textract({
    region: process.env.BUCKET_REGION
});

const ProcessDocument = async (cronJob) => {
    let cronId
    const client = await pool.connect();
    try {

        const { rows: activeCron } = await client.query(`
            SELECT * 
            FROM crons 
            WHERE cron_status = false 
            ORDER BY cron_started_at ASC 
            LIMIT 1
        `);

        // Returing previous cron is still running
        if (activeCron.length > 30) {
            console.log(getElapsedMinutes(activeCron[0].cron_started_at));
            
            if (getElapsedMinutes(activeCron[0].cron_started_at) > 1) {
                console.log("Cron job has exceeded 30 minutes, skipping file.");

                await client.query(`
                    UPDATE crons 
                    SET cron_flagged = true 
                    WHERE cron_id = $1
                `, [activeCron[0].cron_id]);

                // Update the cron status
                await client.query(`
                    UPDATE crons 
                    SET cron_status = true 
                    WHERE cron_id = $1
                `, [activeCron[0].cron_id]);

                console.log("Skipped file and updated cron status.");
                
                await pool.query(`UPDATE documents SET doc_ocr_proccessed = true  WHERE doc_number = '${activeCron[0].cron_feed}'`);
                  return
            } else {
                console.log("Previous cron is still running within the allowed time.");
                return;
            }
        }

        // Previous cron stopped running starting new
        let { rows: document } = await pool.query(`SELECT doc_number,doc_pdf_link FROM documents WHERE doc_ocr_proccessed = false AND doc_pdf_link IS NOT NULL LIMIT 1`);

        // Doesn't have documents to process
        if (document.length == 0) {
            console.log("Nothing to process stopping cron")
            return
        }
        document = document[0];


        // Extracting document name from 
        let doc_pdf_name = new URL(document.doc_pdf_link)
        doc_pdf_name = doc_pdf_name.pathname;
        doc_pdf_name = doc_pdf_name.replace("/docs/", "docs/");

       	// Generate cron_id
		cronId = uuidv4();

		// Insert into crons table with generated cron_id
        
        const res = await pool.query(
            "INSERT INTO crons (cron_id, cron_feed, cron_started_at, cron_type) VALUES ($1, $2, $3, $4) RETURNING *", 
            [cronId, document.doc_number, getCurrentDateTime(), "textract"]
        );

        const startTextractParams = {
            DocumentLocation: {
                S3Object: {
                    Bucket: process.env.BUCKET_NAME,
                    Name: doc_pdf_name,
                },
            },
            ClientRequestToken: uuidv4(),
        };

        async function processTextractJob(jobId, nextToken = null, textractResult = '', totalPagesProcessed = 0) {
            const getStatusParams = {
                JobId: jobId,
                NextToken: nextToken
            };

            const statusResponse = await textract.getDocumentTextDetection(getStatusParams).promise();
            const status = statusResponse.JobStatus;

            // Update total pages processed if DocumentMetadata is available
            if (statusResponse.DocumentMetadata) {
                totalPagesProcessed = statusResponse.DocumentMetadata.Pages;
            }

            if (status === 'SUCCEEDED') {
                textractResult += statusResponse.Blocks.reduce((acc, block) => {
                    if (block.BlockType == 'LINE' || block.BlockType == 'WORD') {
                        acc += block.Text + ",";
                    }
                    return acc;
                }, '');

                if (statusResponse.NextToken) {
                    console.log(statusResponse.NextToken, "<<<<<<<<<<")
                    return processTextractJob(jobId, statusResponse.NextToken, textractResult, totalPagesProcessed);
                } else {
                    console.log("Textract job completed successfully");
                    console.log(`Total pages processed: ${totalPagesProcessed}`);
                    return { textractResult, totalPagesProcessed };
                }
            } else if (status === 'FAILED' || status === 'PARTIAL_SUCCESS') {
                console.error('Textract job failed or partially succeeded. Status:', status);
                throw new Error('Textract job failed or partially succeeded');
            } else {
                console.log('Textract job still in progress. Status:', status);
                await new Promise(resolve => setTimeout(resolve, 10000));
                return processTextractJob(jobId, nextToken, textractResult, totalPagesProcessed);
            }
        }


        const startTextractResponse = await textract.startDocumentTextDetection(startTextractParams).promise();
        const jobId = startTextractResponse.JobId;

        const textractData = await processTextractJob(jobId);

        // Assuming you have document.doc_number available
        const documentDataQuery = `
            SELECT doc_folder, doc_site
            FROM documents
            WHERE doc_number = $1;
            `;

        // Fetching folder name and site name from the documents table
        const { rows: documentData } = await pool.query(documentDataQuery, [document.doc_number]);
        if (documentData.length > 0) {
            const { doc_folder, doc_site } = documentData[0];

            // inserting content into doc_metadata 
            const insertQuery = `
                INSERT INTO doc_metadata (dm_id, dm_ocr_pages, dm_ocr_content, dm_folder_name, dm_site_name)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (dm_id) DO UPDATE SET 
                    dm_ocr_content = EXCLUDED.dm_ocr_content, 
                    dm_ocr_pages = EXCLUDED.dm_ocr_pages,
                    dm_folder_name = EXCLUDED.dm_folder_name,
                    dm_site_name = EXCLUDED.dm_site_name;
            `;

            await pool.query(insertQuery, [
                document.doc_number,
                textractData.totalPagesProcessed,
                textractData.textractResult,
                doc_folder,
                doc_site
            ]);
        }

        await pool.query(`UPDATE documents SET doc_ocr_proccessed = true WHERE doc_number = '${document.doc_number}';`);
        await client.query(`UPDATE crons SET cron_stopped_at = '${getCurrentDateTime()}', cron_status = true`);
        console.log("Content Update Successfully");
    }  catch (err) {
        console.log(err);
        
		// Catch block updates for crons table
        await pool.query(`UPDATE documents SET doc_ocr_proccessed = true  WHERE doc_number = '${document.doc_number}';`);
		const cronError = err.toString();
        const res = await pool.query(
            `UPDATE crons 
             SET cron_stopped_at = $1, cron_status = true, cron_flagged = true, cron_error = $2 
             WHERE cron_id = $3 
             RETURNING *`, 
            [getCurrentDateTime(), cronError, cronId]
          );
          console.log(res.rows); // Logs the updated row
          
        
	}finally {
        client.release(); // Ensure connection is released
        console.log(`Cron finished at ${getCurrentDateTime()}`);
    }
};

const getCurrentDateTime = () => {
    const timeStamp = moment().format('DD/MM/YYYY hh:mm:ss A');
    return timeStamp;
};


const job = cron.schedule('*/30 * * * * *', () => ProcessDocument(job));

