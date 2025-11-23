import amqp from 'amqplib';
import config from '../confg/config.js';

let channel, connection;

export async function connect(){
    connection = await amqp.connect(config.RABBITMQ_URI);
    channel = await connection.createChannel();

    console.log("Connnected to RabbitMQ");
}

export async function publishToQueue(queueName, data){
    await channel.assertQueue(queueName, {durable:true});
    await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));

    console.log("Message sent to queue", queueName);
}