"use strict"
const { pool } = require("../helpers/database.helper.js");
const textractHelper = require("../helpers/textract.helper.js");
const openAIHelper = require("../helpers/openai.helper.js");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");
const moment = require("moment");
const AWS = require("aws-sdk");
const checkFolderType = require('../helpers/checkFolderType.js')
const generateAlphaNumericSuffix = require('../utils/generateRandomAlphanumeric.js')
const parseSubject = require('../utils/parseSubject.js')

// AWS Config
AWS.config.update({
	accessKeyId: process.env.BUCKET_KEY,
	secretAccessKey: process.env.BUCKET_SECRET,
	region: process.env.BUCKET_REGION,
});

const s3 = new AWS.S3();

const processDocument = async (jobID) => {

	let cronId = uuidv4();
	let tempLetterNumber = false;
	let pdfKey

	const params = {
		Bucket: process.env.BUCKET_NAME,
		Prefix: `unzipped_uploads/${jobID}/`,
	};
	const s3Data = await s3.listObjectsV2(params).promise();
	const pdfFiles = s3Data.Contents.filter((file) => file.Key.endsWith(".pdf"));

	console.table({ 'Job started for': jobID, 'total pdf': pdfFiles.length });
	if (pdfFiles.length == 0) {
		const error = new Error("No Pdf Found");
		throw error;
	}


	for (const file of pdfFiles) {
		pdfKey = file.Key;

		try {
			// Process the document
			let textractData = await textractHelper(process.env.BUCKET_NAME, file.Key, true);
			if (!textractData.textractResult || textractData.textractResult === 'undefined') {
				const error = new Error("Unsupported file type");
				error.fileKey = file.Key;
				throw error;

			}
			let extractData = await openAIHelper(textractData.textractResult);
			let extractedOpenAIData = JSON.parse(extractData?.choices && extractData?.choices[0]?.message?.content);

			if (!extractedOpenAIData) {
				console.log('Flagged pdf');
				const newFileKey = `${moment().unix()}_${file.Key.split('/')[2]}`;


				await pool.query(
					`INSERT INTO failed_job_stats (flagged, feed, status, end_at, failed_pdf,job_status,user_id) 
							 VALUES ($1, $2, $3, $4, $5, $6, 7$)`,
					[
						true,
						"Empty AI Response",
						"processing pdf failed",
						getCurrentDateTime(),
						newFileKey,
						"failed",
						(file.Key.replace("unzipped_uploads/", "").match(/^\d+_(\d+)_/) || [])[1]
					]
				);

				continue; // Skip to the next file
			}


			if (!extractedOpenAIData.letter_number) {
				extractedOpenAIData.letter_number = uuidv4();
				tempLetterNumber = true;
			}

			let siteCode = (file.Key.replace("unzipped_uploads/", "").match(/^(\d+)_/) || [])[1];
			let uploadedById = (file.Key.replace("unzipped_uploads/", "").match(/^\d+_(\d+)_/) || [])[1];
			let { rows: userDataFromDb } = await pool.query(`SELECT user_name FROM users WHERE user_id = $1`, [uploadedById]);
			let { rows: siteDataFromDb } = await pool.query(`SELECT * FROM sites WHERE site_id = $1`, [siteCode]);
			let { rows: parentSiteFromDb } = await pool.query(`SELECT * FROM sites WHERE site_id = ${siteDataFromDb[0].site_parent_id}`);

			const newFileName = `${uuidv4()}.pdf`;
			const newFileKey = `docs/${newFileName}`;

			console.log('REPLACEING PDF FOLDER');


			await s3
				.copyObject({
					Bucket: process.env.BUCKET_NAME,
					CopySource: `${process.env.BUCKET_NAME}/${file.Key}`,
					Key: newFileKey,
					MetadataDirective: "REPLACE",
					ContentDisposition: "inline",
					ContentType: "application/pdf",
				})
				.promise();

			await s3
				.deleteObject({
					Bucket: process.env.BUCKET_NAME,
					Key: file.Key,
				})
				.promise();

			const fileUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${newFileKey}`;

			let document = {};

			document.doc_number = extractedOpenAIData.letter_number && extractedOpenAIData?.letter_number?.replace(/\s+/g, "");
			document.doc_type = checkFolderType(siteDataFromDb[0].site_name, extractedOpenAIData.letter_number);
			document.doc_reference = extractedOpenAIData.references && extractedOpenAIData?.references?.replace(/\s+/g, "") ;	
			document.doc_created_at = extractedOpenAIData.date;
			document.doc_subject = parseSubject(extractedOpenAIData.subject);
			document.doc_source = "AI IMPORT";
			document.doc_uploaded_at = moment().format("MM/DD/YYYY");
			document.doc_status = "UPLOADED";
			document.doc_site = parentSiteFromDb[0].site_name;
			document.doc_folder = siteDataFromDb[0].site_name;
			document.doc_uploaded_by_id = uploadedById;
			document.doc_uploaded_by = userDataFromDb[0].user_name;
			document.doc_pdf_link = fileUrl;
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
					document.doc_number,
					document.doc_type,
					document.doc_reference,
					document.doc_created_at,
					document.doc_subject,
					document.doc_source,
					document.doc_uploaded_at,
					document.doc_status,
					document.doc_site,
					document.doc_folder,
					document.doc_uploaded_by_id,
					document.doc_uploaded_by,
					document.doc_pdf_link,
					document.doc_ocr_status,
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

			// ADDING HISTORY
			await pool.query(
				`INSERT INTO doc_history_junction (dhj_doc_number, dhj_history_type, dhj_timestamp,dhj_history_blame,dhj_history_blame_user) VALUES ($1,$2,$3,$4,$5)`,
				[
					extractedOpenAIData.letter_number,
					"UPLOADED",
					moment().format("MM/DD/YYYY HH:mm:ss"),
					uploadedById,
					userDataFromDb[0].user_name,
				]
			);

			console.table({ "Document processed": true, "inserted successfully": true })

		} catch (error) {
			console.error(`Error processing pdf -> ${file.Key}: ${error.message}`);
			const newFileKey = `${moment().unix()}_${file.Key.split('/')[2]}`;

			await pool.query(
				`INSERT INTO failed_job_stats (flagged, feed, status, end_at, failed_pdf,job_status,user_id) 
					 VALUES ($1, $2, $3, $4, $5, $6, $7 )`,
				[
					true,
					error.message,
					"processing pdf failed",
					getCurrentDateTime(),
					newFileKey,
					"failed",
					(file.Key.replace("unzipped_uploads/", "").match(/^\d+_(\d+)_/) || [])[1]
				]
			);

			// Continue with the next file even if this one fails
			continue;
		}
	}



};

const getCurrentDateTime = () => {
	const timeStamp = moment().format("DD/MM/YYYY hh:mm:ss A");
	return timeStamp;
};


module.exports = processDocument