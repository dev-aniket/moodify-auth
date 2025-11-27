import amqp from 'amqplib';
import config from '../confg/config.js';

let connection = null;
let channel = null;

export async function connect() {
    try {
        // If we already have a working connection, don't create a new one
        if (connection && channel) return;

        console.log("🐰 Connecting to RabbitMQ...");
        
        connection = await amqp.connect(config.RABBITMQ_URI);

        // 🛑 CRITICAL FIX: Handle Connection Errors
        // This prevents the "Unhandled 'error' event" crash
        connection.on("error", (err) => {
            console.error("🔴 RabbitMQ Connection Error:", err.message);
            connection = null;
            channel = null;
        });

        // Handle Connection Closure (e.g. RabbitMQ server restarts)
        connection.on("close", () => {
            console.warn("⚠️ RabbitMQ Connection Closed.");
            connection = null;
            channel = null;
        });

        channel = await connection.createChannel();
        console.log("✅ Connected to RabbitMQ");

    } catch (err) {
        console.error("❌ Failed to connect to RabbitMQ:", err.message);
        // We do NOT throw the error here, so the server can keep running
        // even if RabbitMQ is down.
    }
}

export async function publishToQueue(queueName, data) {
    try {
        // 1. Auto-Reconnect: If channel is missing, try to connect first
        if (!channel) {
            await connect();
        }

        // 2. Safety Check: If connection failed, stop here (don't crash)
        if (!channel) {
            console.error("❌ Cannot publish message: No RabbitMQ connection.");
            return; 
        }

        await channel.assertQueue(queueName, { durable: true });
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
        console.log(`📨 Message sent to queue: ${queueName}`);

    } catch (error) {
        // 3. Catch Publish Errors: Ensure user registration succeeds even if queue fails
        console.error("❌ Error publishing to queue:", error.message);
    }
}