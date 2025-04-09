# GCP Release Notes Dashboard: Deployment Guide

This guide provides step-by-step instructions for deploying the unified GCP Release Notes Dashboard to Google Cloud Run or Google Compute Engine (GCE).

## Machine Portability

The application has been designed to be fully portable and machine-agnostic:

- **Relative URLs**: All asset and API URLs use relative paths
- **No hardcoded IPs**: No reliance on specific IP addresses or domains
- **Self-contained**: Backend serves frontend assets from the same origin
- **Cross-environment consistency**: Works the same in local, VM, and cloud environments
- **HTTPS Support**: Automatic handling of HTTPS redirects in Cloud Run

This means you can deploy the application on any machine or cloud service without modification, and it will automatically adapt to whatever hostname or IP address is used to access it.

## Prerequisites

1. **Google Cloud Platform Account**
   - Active billing enabled
   - Required APIs enabled:
     - Cloud Run API
     - Container Registry API
     - Cloud Build API
     - BigQuery API
     - Vertex AI API
     - Firestore API

2. **Tools Installed**
   - [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
   - [Docker](https://docs.docker.com/get-docker/)
   - [Node.js](https://nodejs.org/) (for local testing)
   - [Git](https://git-scm.com/downloads)

3. **Service Account Setup**
   - Create a service account with the following roles:
     - `roles/bigquery.dataViewer`
     - `roles/aiplatform.user`
     - `roles/run.admin`
     - `roles/storage.admin`
     - `roles/datastore.user`

## Step 1: Environment Configuration

### 1.1 Clone the Repository
```bash
git clone https://github.com/your-username/gcp-release-notes-dashboard.git
cd gcp-release-notes-dashboard
```

### 1.2 Configure Google Cloud CLI
```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Configure Docker to use Google Container Registry
gcloud auth configure-docker
```

## Step 2: Environment Configuration

### 2.1 Configure Backend Environment Variables
1. Create a `backend/.env.prod` file based on the provided template:
   ```bash
   cp backend/.env.example backend/.env.prod
   ```

2. Edit the `backend/.env.prod` file with your production values:
   ```
   # Server configuration
   PORT=5173
   NODE_ENV=production

# Google Cloud configuration
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
# For Cloud Run, you can omit GOOGLE_APPLICATION_CREDENTIALS and use the service account

# BigQuery configuration
BIGQUERY_PROJECT_ID=your-gcp-project-id
BIGQUERY_DATASET=bigquery-public-data.google_cloud_release_notes
BIGQUERY_TABLE=release_notes

# Vertex AI configuration
VERTEXAI_PROJECT_ID=your-gcp-project-id
VERTEXAI_LOCATION=us-central1
VERTEXAI_MODEL_ID=gemini-1.5-flash

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Firestore configuration
FIRESTORE_COLLECTION=visitor_counters
FIRESTORE_DOCUMENT_ID=global_counter
```

### 1.2 Configure Frontend Environment Variables
Create a `frontend/.env.production` file:
```bash
cat <<EOF > frontend/.env.production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_AI_SUMMARY=true
VITE_DEFAULT_TIMEFRAME=last_month
VITE_MAX_PRODUCTS_SELECTION=10
EOF
```

## Step 2: Deploy to Google Cloud Run

### 2.1 Build and Push Docker Image
```bash
# Build the Docker image with production environment files
docker build --build-arg BACKEND_ENV_FILE=backend/.env.prod \
             --build-arg FRONTEND_ENV_FILE=frontend/.env.production \
             -t gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest .

# Push the image to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest
```

### 2.2 Deploy to Cloud Run
```bash
gcloud run deploy gcp-release-notes-dashboard \
  --image=gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --port=5173
```

## HTTPS Handling in Cloud Run

Cloud Run automatically provisions HTTPS endpoints and terminates TLS connections at its edge. The dashboard application is configured to handle this setup correctly:

### Automatic HTTPS Redirects
The application now automatically detects when a request comes in via HTTP and redirects it to HTTPS. This is important because:

1. Cloud Run services always receive requests over HTTPS at the edge
2. Requests are forwarded internally with the `X-Forwarded-Proto` header
3. The application checks this header and redirects as needed

### Headers and Security Configuration
The application sets appropriate headers for both HTTP and HTTPS:

- Content Security Policy allows both HTTP and HTTPS resources
- Cache control headers prevent browser caching issues 
- CORS is configured to work with all origins

### Troubleshooting HTTPS Issues
If you encounter HTTPS-related issues in Cloud Run:

1. Check the application logs for any redirect errors:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gcp-release-notes-dashboard AND textPayload:proto"
   ```

2. Verify that your application is detecting the `X-Forwarded-Proto` header correctly:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gcp-release-notes-dashboard AND textPayload:headers"
   ```

3. Ensure `trust proxy` is set in the application (already configured in the codebase):
   ```javascript
   app.set('trust proxy', true);
   ```

## Step 3: Deploy to Google Compute Engine (Alternative)

### 3.1 Create a GCE VM Instance
```bash
gcloud compute instances create gcp-release-notes-dashboard \
  --machine-type=e2-medium \
  --zone=us-central1-a \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=http-server \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB
```

### 3.2 Set Up Firewall Rules
```bash
gcloud compute firewall-rules create allow-dashboard \
  --action=ALLOW \
  --rules=tcp:5173 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server
```

### 3.3 Deploy Using Docker on VM
```bash
# SSH into the VM
gcloud compute ssh gcp-release-notes-dashboard --zone=us-central1-a

# On the VM:
git clone https://github.com/your-username/gcp-release-notes-dashboard.git
cd gcp-release-notes-dashboard

# Set up environment files
cp backend/.env.example backend/.env.prod
cp frontend/.env.example frontend/.env.production

# Edit environment files with your configuration
nano backend/.env.prod
nano frontend/.env.production

# Build and run the Docker container
docker build --build-arg BACKEND_ENV_FILE=backend/.env.prod \
             --build-arg FRONTEND_ENV_FILE=frontend/.env.production \
             -t gcp-release-notes-dashboard:latest .

docker run -d -p 5173:5173 --restart unless-stopped gcp-release-notes-dashboard:latest
```

## Troubleshooting

### Common Issues and Solutions

1. **Cannot Access Application from External IP**
   - Verify the application is binding to all interfaces (0.0.0.0):
     ```bash
     # Check what addresses the application is listening on
     sudo netstat -tulpn | grep 5173
     ```
   - Ensure firewall rules are correctly set up
   - Check VM network tags

2. **Container Build Failures**
   - Verify environment files are correctly set up
   - Check Docker build logs for errors
   - Ensure all required environment variables are set

3. **API Connection Issues**
   - Verify that required Google Cloud APIs are enabled
   - Check service account permissions
   - Ensure Firestore is properly configured

4. **HTTPS and Redirect Issues**
   - Check if your Cloud Run service is being accessed at the correct URL
   - Verify request headers in the application logs
   - Check the browser console for mixed content warnings

## Quick Reference Commands

### Build and Deploy
```bash
# Local build and test
npm run install:all
npm run build
npm start

# Manual deployment
docker build --build-arg BACKEND_ENV_FILE=backend/.env.prod \
             --build-arg FRONTEND_ENV_FILE=frontend/.env.production \
             -t gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest .
docker push gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest
gcloud run deploy gcp-release-notes-dashboard --image=gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest --region=us-central1 --platform=managed --allow-unauthenticated --port=5173
```

### Monitoring
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gcp-release-notes-dashboard"

# Get service URL
gcloud run services describe gcp-release-notes-dashboard --platform=managed --region=us-central1 --format='value(status.url)'
``` 