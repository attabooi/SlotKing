#!/bin/bash

# Exit on any error
set -e

# Configuration
PROJECT_ID="your-firebase-project-id"
SERVICE_NAME="slotking-backend"
REGION="us-central1"

echo "Building Docker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

# Get the URL of the deployed service
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format="value(status.url)")

echo "Service deployed to: $SERVICE_URL"
echo "Make sure to update the WebSocket URL in your client code to: ${SERVICE_URL/https:/wss:}/ws" 