const { createClient } = require("redis");
const { Queue, Worker } = require("bullmq");

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
            //   console.log(`Processing job ${job.data}...`);

            return await new Promise((resolve, reject) => {
                setTimeout(async () => {
                    resolve()
                }, 10000)
            })


        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
        }
    },

    { connection }
);

worker.on("completed", async (job) => {
    console.log(`Job ${job.data
        
    }`);
});

worker.on("failed", (job, err) => {
    console.error(`Job ${job} failed: ${err.message}`);
});

worker.on("error", (err) => {
    console.error("Worker error:", err.message);
});

module.exports = { connection, worker, checkRedisConnection, queue };
