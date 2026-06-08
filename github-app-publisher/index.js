const express = require('express');
const crypto = require('crypto');
const { PubSub } = require('@google-cloud/pubsub');

// Load environment variables
require('dotenv').config();

const app = express();

// Use express.raw() to capture raw request body bytes (mandatory for HMAC verification)
app.use(express.raw({ type: 'application/json' }));

// Initialize GCP Pub/Sub client
const pubSubClient = new PubSub({
  projectId: process.env.GCP_PROJECT_ID || 'brewery-homelab',
  // Local emulator support
  apiEndpoint: process.env.PUBSUB_EMULATOR_HOST || undefined
});

const TOPIC_NAME = process.env.PUBSUB_TOPIC_NAME || 'brewery-jobs';
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * Validates request payload hash matches header to verify authenticity
 */
function verifySignature(payload, signatureHeader) {
  if (!WEBHOOK_SECRET) {
    console.warn('Warning: GITHUB_WEBHOOK_SECRET is not configured. Skipping signature verification.');
    return true;
  }
  if (!signatureHeader) {
    return false;
  }
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(digest));
}

app.post('/webhook', async (req, res) => {
  const signatureHeader = req.headers['x-hub-signature-256'];
  const eventType = req.headers['x-github-event'];
  
  if (!eventType) {
    return res.status(400).send('Missing X-GitHub-Event header');
  }

  // 1. Verify webhook signature
  if (!verifySignature(req.body, signatureHeader)) {
    console.error('Signature verification failed.');
    return res.status(401).send('Signature verification failed');
  }

  console.log(`Received GitHub event: ${eventType}`);

  try {
    // 2. Publish raw payload to GCP Pub/Sub
    const topic = pubSubClient.topic(TOPIC_NAME);
    
    // Pass event metadata inside headers/attributes
    const attributes = {
      'x-github-event': eventType
    };
    if (signatureHeader) {
      attributes['x-hub-signature-256'] = signatureHeader;
    }

    const messageId = await topic.publishMessage({
      data: req.body,
      attributes: attributes
    });

    console.log(`Successfully published message ${messageId} to topic ${TOPIC_NAME}`);
    res.status(202).send({ message: 'Accepted', messageId });
  } catch (error) {
    console.error('Failed to publish message to Pub/Sub:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GitHub App Webhook Proxy listening on port ${PORT}`);
});
