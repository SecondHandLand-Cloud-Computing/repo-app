import amqp from "amqplib";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const DEFAULT_QUEUE = env.RABBITMQ_QUEUE || "order.created";
const DEFAULT_URL = env.RABBITMQ_URL || "amqp://rabbitmq:5672";

let connection = null;
let channel = null;
let connectPromise = null;

const ensureConnection = async () => {
  if (connection && channel) return { connection, channel };
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const conn = await amqp.connect(DEFAULT_URL);
    const ch = await conn.createChannel();

    conn.on("error", (err) => {
      logger.error(`[RabbitMQ] connection error: ${err.message}`);
    });

    conn.on("close", () => {
      logger.warn("[RabbitMQ] connection closed");
      connection = null;
      channel = null;
      connectPromise = null;
    });

    await ch.assertQueue(DEFAULT_QUEUE, { durable: true });
    connection = conn;
    channel = ch;
    connectPromise = null;

    logger.info(`[RabbitMQ] connected to ${DEFAULT_URL}`);
    return { connection, channel };
  })().catch((err) => {
    connectPromise = null;
    throw err;
  });

  return connectPromise;
};

export const RabbitMQService = {
  queueName: DEFAULT_QUEUE,

  async connect() {
    return ensureConnection();
  },

  async publish(message, queueName = DEFAULT_QUEUE) {
    const { channel: ch } = await ensureConnection();
    const payload = Buffer.from(JSON.stringify(message));
    ch.sendToQueue(queueName, payload, { persistent: true });
  },

  async consume(handler, queueName = DEFAULT_QUEUE) {
    const { channel: ch } = await ensureConnection();
    await ch.prefetch(1);
    await ch.consume(
      queueName,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          ch.ack(msg);
        } catch (err) {
          logger.error(`[RabbitMQ] consume error: ${err.message}`);
          ch.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  },

  async close() {
    if (channel) await channel.close();
    if (connection) await connection.close();
    connection = null;
    channel = null;
    connectPromise = null;
  },
};