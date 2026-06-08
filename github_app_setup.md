# GitHub App Setup & Integration Guide

To trigger automated builds in Brewery from private networks without exposing public HTTP ports, you can deploy a standalone **GitHub App Webhook Proxy** in a separate repository. This document explains how to name, register, and implement this publisher proxy.

---

## 1. Project Naming Concepts
Since the main project is **Brewery**, here are some themed names prefixed with `brewery-` for your GitHub App and its webhook repository:

* **brewery-tap** (Highly Recommended): A "tap" connects the brewery's casks/kegs to the outside world. Similarly, `brewery-tap` connects GitHub webhooks directly to your internal pub/sub build system.
* **brewery-yeast**: Yeast is the catalyst that starts the fermentation (build) process. This represents the component that kickstarts the build cycle.
* **brewery-valve**: A valve controls the flow of liquid. This represents controlling and forwarding the stream of commit/push events.
* **brewery-gateway**: A straightforward name representing the public ingress gateway for repository events.

---

## 2. Registering the GitHub App on GitHub

1. **Navigate to App Registration**:
   - Go to your personal **GitHub Settings** (or **Organization Settings** if hosting under an organization).
   - In the left sidebar, click **Developer settings** > **GitHub Apps** > **New GitHub App**.

2. **Fill in General Settings**:
   - **GitHub App name**: Enter your chosen name (e.g., `brewery-tap`).
   - **Homepage URL**: Enter your main system URL or repository (e.g., `https://github.com/your-org/brewery`).
   - **Active Webhook**: Check the **Active** box.
   - **Webhook URL**: Enter the public URL where your standalone webhook proxy will be hosted (e.g., a Vercel function, GCP Cloud Function, or an `ngrok` URL for local testing).
   - **Webhook secret**: Enter a strong, random password. Keep this secret safe; the proxy will use it to verify the signature of incoming events.

3. **Configure Permissions**:
   Under **Repository permissions**, enable:
   - **Contents**: `Read-only` (allows Brewery to clone/checkout code during a build).
   - **Metadata**: `Read-only` (selected by default, grants access to repository metadata).
   - **Commit statuses**: `Read & write` (allows the build engine to report build status directly to GitHub commits).

4. **Subscribe to Webhook Events**:
   Under **Subscribe to events**, select:
   - **Push** (triggers a build whenever code is pushed to a monitored branch).
   - *(Optional)* **Pull request** (if you wish to build pull request branches).

5. **Save and Install**:
   - Click **Create GitHub App**.
   - Select **Install App** on the left menu.
   - Choose the target user or organization, select **All repositories** or **Only select repositories**, and click **Install**.

---

## 3. Proxy Codebase Implementation
You can create a new, separate repository (e.g., `yeast-node-proxy`) containing the following three files to run your proxy serverless on Node.js.

### `package.json`
```json
{
  "name": "yeast-node-proxy",
  "version": "1.0.0",
  "description": "Receives GitHub App webhooks and forwards them to GCP Pub/Sub.",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@google-cloud/pubsub": "^4.8.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  }
}
```

### `index.js`
```javascript
const express = require('express');
const crypto = require('crypto');
const { PubSub } = require('@google-cloud/pubsub');

require('dotenv').config();

const app = express();

// Capture raw body bytes (mandatory for HMAC verification)
app.use(express.raw({ type: 'application/json' }));

const pubSubClient = new PubSub({
  projectId: process.env.GCP_PROJECT_ID || 'brewery-homelab',
  apiEndpoint: process.env.PUBSUB_EMULATOR_HOST || undefined
});

const TOPIC_NAME = process.env.PUBSUB_TOPIC_NAME || 'brewery-jobs';
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

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

  if (!verifySignature(req.body, signatureHeader)) {
    console.error('Signature verification failed.');
    return res.status(401).send('Signature verification failed');
  }

  console.log(`Received event: ${eventType}`);

  try {
    const topic = pubSubClient.topic(TOPIC_NAME);
    const attributes = { 'x-github-event': eventType };
    if (signatureHeader) {
      attributes['x-hub-signature-256'] = signatureHeader;
    }

    const messageId = await topic.publishMessage({
      data: req.body,
      attributes: attributes
    });

    console.log(`Published message ${messageId} to topic ${TOPIC_NAME}`);
    res.status(202).send({ message: 'Accepted', messageId });
  } catch (error) {
    console.error('Failed to publish to Pub/Sub:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook proxy listening on port ${PORT}`);
});
```

### `.env.example`
```env
PORT=3000
GCP_PROJECT_ID=brewery-homelab
PUBSUB_TOPIC_NAME=brewery-jobs
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# For local testing against the pubsub emulator:
PUBSUB_EMULATOR_HOST=localhost:8085
```
