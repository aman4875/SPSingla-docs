const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");
const dotenv = require("dotenv").config();
const { PDFDocument } = require("pdf-lib");
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const createPdfFromFirstPage = require('../utils/createPdfFromFirstPage')

// AWS Config
AWS.config.update({
	accessKeyId: process.env.BUCKET_KEY,
	secretAccessKey: process.env.BUCKET_SECRET,
	region: process.env.BUCKET_REGION,
});

const textract = new AWS.Textract();
const s3 = new AWS.S3();

const s3Client = new S3Client({
	region: process.env.BUCKET_REGION,
	credentials: {
		accessKeyId: process.env.BUCKET_KEY,
		secretAccessKey: process.env.BUCKET_SECRET
	}
});

const processTextract = async (bucketName, fileKey, firstPageOnly) => {
	try {
		const fileExtension = fileKey.split(".").pop().toLowerCase();
		let tempPdfKey;

		// Helper function to create PDF from the first page of a PDF or an image
		const createFirstPagePdf = async (originalFileBuffer, fileType, bucketName, fileKey) => {
			console.log('started working for fileKey', fileKey);

			if (fileType === "pdf") {
				const command = new GetObjectCommand({ Bucket: bucketName, Key: fileKey });
				const { Body } = await s3Client.send(command);
				const newPdf = await createPdfFromFirstPage(Body);
				return newPdf
			} else {
				const pdfDoc = await PDFDocument.create();
				const image = fileType === "jpeg" || fileType === "jpg" ? await pdfDoc.embedJpg(originalFileBuffer) : await pdfDoc.embedPng(originalFileBuffer);
				const page = pdfDoc.addPage();
				page.drawImage(image, {
					x: 0,
					y: 0,
					width: page.getWidth(),
					height: page.getHeight(),
				});
			}
			return pdfDoc.save();
		};

		if (firstPageOnly) {
			if (["pdf", "jpeg", "jpg"].includes(fileExtension)) {

				const originalFile = await s3.getObject({ Bucket: bucketName, Key: fileKey }).promise();
				const firstPagePdfBytes = await createFirstPagePdf(originalFile.Body, fileExtension, bucketName, fileKey);
				tempPdfKey = `temp_pdf/${uuidv4()}.pdf`;
				await s3
					.putObject({
						Bucket: bucketName,
						Key: tempPdfKey,
						Body: firstPagePdfBytes,
						ContentType: "application/pdf",
					})
					.promise();

				const textractResult = await extractTextFromPdf(bucketName, tempPdfKey);

				// Delete the temporary PDF
				await s3.deleteObject({ Bucket: bucketName, Key: tempPdfKey }).promise();

				return { textractResult, totalPagesProcessed: 1 };
			} else {
				throw new Error("Unsupported file type for firstPageOnly processing.");
			}
		} else {
			// Asynchronous Text Detection for all pages
			return await startTextractJob(bucketName, fileKey);
		}
	} catch (error) {
		console.error("Error processing Textract job:", error);
		throw error;
	}
};

// Helper function to extract text from a PDF using Textract
const extractTextFromPdf = async (bucketName, fileKey) => {
	const textractResponse = await textract
		.detectDocumentText({
			Document: {
				S3Object: {
					Bucket: bucketName,
					Name: fileKey,
				},
			},
		})
		.promise();

	return textractResponse.Blocks.filter((block) => block.BlockType === "LINE")
		.map((block) => block.Text)
		.join(" ");
};

// Helper function to start a Textract job
const startTextractJob = async (bucketName, fileKey) => {
	const startTextractParams = {
		DocumentLocation: {
			S3Object: {
				Bucket: bucketName,
				Name: fileKey,
			},
		},
		ClientRequestToken: uuidv4(),
	};

	const startTextractResponse = await textract.startDocumentTextDetection(startTextractParams).promise();
	const jobId = startTextractResponse.JobId;

	return await pollTextractJob(jobId);
};

// Helper function to poll the Textract job until completion
const pollTextractJob = async (jobId, nextToken = null, textractResult = "", totalPagesProcessed = 0) => {
	const getStatusParams = { JobId: jobId, NextToken: nextToken };

	try {
		const textractResponse = await textract.getDocumentTextDetection(getStatusParams).promise();
		const status = textractResponse.JobStatus;

		if (textractResponse.DocumentMetadata) {
			totalPagesProcessed = textractResponse.DocumentMetadata.Pages;
		}

		if (status === "SUCCEEDED") {
			textractResponse.Blocks.forEach((block) => {
				if (block.BlockType === "LINE") {
					textractResult += block.Text + " ";
				}
			});

			if (textractResponse.NextToken) {
				return pollTextractJob(jobId, textractResponse.NextToken, textractResult, totalPagesProcessed);
			} else {
				return { textractResult, totalPagesProcessed };
			}
		} else if (status === "FAILED" || status === "PARTIAL_SUCCESS") {
			throw new Error(`Textract job ${status.toLowerCase()}`);
		} else {
			await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
			return pollTextractJob(jobId, nextToken, textractResult, totalPagesProcessed);
		}
	} catch (error) {
		console.error("Error polling Textract job:", error);
		throw error;
	}
};

module.exports = processTextract;
