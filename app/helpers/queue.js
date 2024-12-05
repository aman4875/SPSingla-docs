const { createClient } = require("redis");
const { Queue, Worker } = require("bullmq");
const processDocument = require('../crons/processPdf')
const { pool } = require("../helpers/database.helper");
const moment = require("moment");

const getCurrentDateTime = () => {
    const timeStamp = moment().format("DD/MM/YYYY hh:mm:ss A");
    return timeStamp;
};

const connection = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
};

const queue = new Queue("ai-uploads", {
    connection,
    defaultJobOptions: {
        // removeOnComplete: true, // Removes completed jobs automatically
    },
});


async function checkRedisConnection() {
    try {
        const redisClient = createClient(connection);
        await redisClient.connect();
        console.log("Redis server connected successfully!");
        await redisClient.disconnect();
    } catch (err) {
        console.error("Error connecting to Redis:", err.message);
    }
}

const worker = new Worker(
    "ai-uploads",
    async (job) => {
        try {
            await processDocument(job.data.jobID)

        } catch (error) {
            await pool.query(
                `INSERT INTO failed_job_stats (job_status,end_at,feed) VALUES ($1,$2,$3)`,
                ["failed", getCurrentDateTime(), err.message]
            );
        }
    },

    { connection }
);

worker.on("completed", async (job) => {
    await pool.query(
        `UPDATE jobs 
         SET job_status = $1, end_at = $2
         WHERE job_id = $3`,
        ["completed", getCurrentDateTime(), job.data.jobID]
    );

});

worker.on("failed", async (job, err) => {
    console.error(`Job ${job.data.jobID} failed: ${err.message}`);

    const feedMessage = err?.message || "Unknown error";

    await pool.query(
        `UPDATE jobs 
         SET job_status = $1, end_at = $2, feed = $3 
         WHERE job_id = $4`,
        ["failed", getCurrentDateTime(), feedMessage, job.data.jobID]
    );


});

worker.on("error", async (err) => {
    const feedMessage = err?.message || "Unknown error";

    await pool.query(
        `UPDATE jobs 
         SET job_status = $1, end_at = $2, feed = $3 
         WHERE job_id = $4`,
        ["failed", getCurrentDateTime(), feedMessage, job.data.jobID]
    );
});

module.exports = { connection, worker, checkRedisConnection, queue };
