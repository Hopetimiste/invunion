/**
 * Pub/Sub client configuration
 */

import { PubSub, Topic } from '@google-cloud/pubsub';
import { config } from './index.js';

let pubsubClient: PubSub | null = null;
const topicsCache: Map<string, Topic> = new Map();

export function getPubSubClient(): PubSub {
  if (!pubsubClient) {
    pubsubClient = new PubSub({
      projectId: config.projectId,
    });
    console.log('[PubSub] Client initialized');
  }
  return pubsubClient;
}

function getTopic(topicName: string): Topic {
  if (!topicsCache.has(topicName)) {
    const topic = getPubSubClient().topic(topicName);
    topicsCache.set(topicName, topic);
  }
  return topicsCache.get(topicName)!;
}

export interface PubSubMessage {
  type: string;
  tenantId: string;
  payload: Record<string, any>;
  timestamp: string;
  correlationId?: string;
}

/**
 * Publish a message to a Pub/Sub topic
 */
export async function publishMessage(
  topicName: string,
  message: PubSubMessage
): Promise<string> {
  const topic = getTopic(topicName);
  const dataBuffer = Buffer.from(JSON.stringify(message));
  
  const messageId = await topic.publishMessage({
    data: dataBuffer,
    attributes: {
      type: message.type,
      tenantId: message.tenantId,
      timestamp: message.timestamp,
    },
  });
  
  console.log(`[PubSub] Message published to ${topicName}`, { messageId, type: message.type });
  return messageId;
}

/**
 * Publish to ingest topic
 */
export async function publishToIngest(
  tenantId: string,
  type: string,
  payload: Record<string, any>,
  correlationId?: string
): Promise<string> {
  return publishMessage(config.pubsub.topicIngest, {
    type,
    tenantId,
    payload,
    timestamp: new Date().toISOString(),
    correlationId,
  });
}

/**
 * Publish to matching topic
 */
export async function publishToMatching(
  tenantId: string,
  type: string,
  payload: Record<string, any>,
  correlationId?: string
): Promise<string> {
  return publishMessage(config.pubsub.topicMatching, {
    type,
    tenantId,
    payload,
    timestamp: new Date().toISOString(),
    correlationId,
  });
}

/**
 * Publish to alerts topic
 */
export async function publishToAlerts(
  tenantId: string,
  type: string,
  payload: Record<string, any>,
  correlationId?: string
): Promise<string> {
  return publishMessage(config.pubsub.topicAlerts, {
    type,
    tenantId,
    payload,
    timestamp: new Date().toISOString(),
    correlationId,
  });
}
