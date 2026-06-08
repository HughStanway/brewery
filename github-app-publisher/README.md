# GitHub App Webhook Proxy for Brewery

This directory contains a lightweight, secure Node.js proxy designed to act as the public webhook endpoint for your GitHub App. Since your local Brewery server runs behind a private network without open ports, this proxy bridges the gap by receiving webhook payloads from GitHub and publishing them directly to a Google Cloud Pub/Sub topic, which the local server polls.

## How It Works
1. A developer pushes code to a GitHub repository.
2. GitHub sends a webhook payload to the public proxy URL.
3. The proxy verifies the payload signature using the `GITHUB_WEBHOOK_SECRET`.
4. If valid, the proxy publishes the raw body bytes and the event type metadata to Google Cloud Pub/Sub.
5. The local Brewery server consumes the message from the Pub/Sub subscription and triggers a build.

## Configuration
Create a `.env` file in this folder (or configure environment variables in your deployment environment):

```env
PORT=3000
GCP_PROJECT_ID=brewery-homelab
PUBSUB_TOPIC_NAME=brewery-jobs
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# For local development with the emulator:
PUBSUB_EMULATOR_HOST=localhost:8085
```

## Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Deploying to Google Cloud Functions
To deploy this as a serverless Google Cloud Function:

```bash
gcloud functions deploy brewery-github-webhook \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=app \
  --set-env-vars GCP_PROJECT_ID=brewery-homelab,PUBSUB_TOPIC_NAME=brewery-jobs,GITHUB_WEBHOOK_SECRET=your_secret
```

*(Note: When deploying to Cloud Functions, change the export in `index.js` to `exports.app = app;` and omit the `app.listen` block, or wrap it in a condition.)*
