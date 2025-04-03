# GCP Release Notes Dashboard: Deployment Guide

This guide provides step-by-step instructions for deploying the unified GCP Release Notes Dashboard to Google Cloud Run or Google Compute Engine (GCE).

## Prerequisites

1. **Google Cloud Platform Account**
   - Active billing enabled
   - Required APIs enabled:
     - Cloud Run API
     - Container Registry API
     - Cloud Build API
     - BigQuery API
     - Vertex AI API

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

## Step 1: Initial Setup

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

   # CORS configuration (no longer needed for cross-origin requests since frontend and backend are served together)
   # ALLOWED_ORIGINS=https://YOUR_DOMAIN.com

   # Google Cloud configuration
   GOOGLE_CLOUD_PROJECT=your-gcp-project-id
   # For Cloud Run, you can omit GOOGLE_APPLICATION_CREDENTIALS and use the service account
   # GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

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
   ```

### 2.2 Configure Frontend Environment Variables
1. Create a `frontend/.env.production` file:
   ```bash
   # Create the file with production settings
   cat <<EOF > frontend/.env.production
   # The API_URL is not needed as we're serving from the same origin
   # VITE_API_URL=http://localhost:8080
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_AI_SUMMARY=true
   VITE_DEFAULT_TIMEFRAME=last_month
   VITE_MAX_PRODUCTS_SELECTION=10
   EOF
   ```

## Step 3: Testing Locally

### 3.1 Install Dependencies and Build
```bash
# Install dependencies for root, backend, and frontend
npm run install:all

# Build both frontend and backend
npm run build
```

### 3.2 Run the Application Locally
```bash
# Start the application
npm start
```

Your application should now be running at http://localhost:5173.

### 3.3 Test Docker Build
```bash
# Build the Docker image
docker build -t gcp-release-notes-dashboard:local .

# Run the Docker image
docker run -p 5173:5173 gcp-release-notes-dashboard:local
```

Visit http://localhost:5173 to verify that the application is working correctly.

## Step 4: Deploy to Google Cloud Run

### 4.1 Manual Deployment

1. Build and push the Docker image to Google Container Registry:
   ```bash
   # First, make sure your environment files exist
   cp backend/.env.example backend/.env.prod
   cp frontend/.env.example frontend/.env.production
   
   # Edit these files with your production settings
   nano backend/.env.prod
   nano frontend/.env.production
   
   # Build the Docker image with production environment files
   docker build --build-arg BACKEND_ENV_FILE=backend/.env.prod \
                --build-arg FRONTEND_ENV_FILE=frontend/.env.production \
                -t gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest .

   # Push the image to Google Container Registry
   docker push gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest
   ```

   > **Note:** If you encounter errors about copying files to themselves, ensure you're using the correct environment file paths that are different from the default destination paths.

2. Deploy to Cloud Run:
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

### 4.2 Automated Deployment with Cloud Build

1. Store your environment files in Google Cloud Secret Manager:
   ```bash
   # Create secrets for the backend and frontend environment files
   gcloud secrets create gcp-release-notes-backend-env --data-file=backend/.env.prod
   gcloud secrets create gcp-release-notes-frontend-env --data-file=frontend/.env.production
   ```

2. Grant the Cloud Build service account access to Secret Manager:
   ```bash
   PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
     --role=roles/secretmanager.secretAccessor
   ```

3. Trigger the Cloud Build using the provided cloudbuild.yaml:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml .
   ```

## Step 5: Deploy to Google Compute Engine (Alternative to Cloud Run)

If you prefer to deploy to a VM instead of Cloud Run, follow these steps:

### 5.1 Create a GCE VM Instance
```bash
# Create a VM instance with the necessary scopes for BigQuery and Vertex AI
gcloud compute instances create gcp-release-notes-dashboard \
  --machine-type=e2-medium \
  --zone=us-central1-a \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=http-server,https-server \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB
```

### 5.2 Set Up Firewall Rules
```bash
# Create a firewall rule to allow HTTP traffic
gcloud compute firewall-rules create allow-http \
  --action=ALLOW \
  --rules=tcp:5173 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server
```

### 5.3 SSH into the VM
```bash
gcloud compute ssh gcp-release-notes-dashboard --zone=us-central1-a
```

### 5.4 Install Dependencies on the VM
```bash
# Update package lists
sudo apt-get update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git

# Install Docker (optional, if you want to use Docker on the VM)
sudo apt-get install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# Log out and log back in for group changes to take effect
```

### 5.5 Deploy the Application on the VM

#### Option 1: Direct Deployment
```bash
# Clone the repository
git clone https://github.com/your-username/gcp-release-notes-dashboard.git
cd gcp-release-notes-dashboard

# Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.production

# Edit environment files with your configuration
nano backend/.env
nano frontend/.env.production

# Install dependencies and build
npm run install:all
npm run build

# Start the application
npm start
```

#### Option 2: Docker Deployment on VM
```bash
# Clone the repository
git clone https://github.com/your-username/gcp-release-notes-dashboard.git
cd gcp-release-notes-dashboard

# Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.production

# Edit environment files with your configuration
nano backend/.env
nano frontend/.env.production

# Build the Docker image
docker build -t gcp-release-notes-dashboard:latest .

# Run the container
docker run -d -p 5173:5173 gcp-release-notes-dashboard:latest
```

### 5.6 Set Up a Startup Script (Optional)
Create a systemd service to start the application on boot:

```bash
sudo nano /etc/systemd/system/dashboard.service
```

Add the following content:
```
[Unit]
Description=GCP Release Notes Dashboard
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/gcp-release-notes-dashboard
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable dashboard
sudo systemctl start dashboard
```

## Step 6: Set Up Custom Domain (Optional)

### 6.1 Map a Custom Domain to Your Cloud Run Service
1. Verify domain ownership in Cloud Console
2. Map the domain to your service:
   ```bash
   gcloud beta run domain-mappings create \
     --service=gcp-release-notes-dashboard \
     --domain=dashboard.yourdomain.com \
     --region=us-central1
   ```

3. Update DNS records according to the instructions provided by Google Cloud

## Step 7: Continuous Deployment with GitHub Actions

### 7.1 Setting up GitHub Secrets
Add the following secrets to your GitHub repository:
- `GCP_PROJECT_ID`: Your Google Cloud Project ID
- `GCP_SA_KEY`: Base64-encoded service account key JSON

### 7.2 Create GitHub Actions Workflow
Create a file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v1
      with:
        project_id: ${{ secrets.GCP_PROJECT_ID }}
        service_account_key: ${{ secrets.GCP_SA_KEY }}
    - name: Configure Docker
      run: gcloud auth configure-docker
    - name: Create environment files
      run: |
        # Create backend .env.prod file (replace with your actual config or use secrets)
        cat <<EOF > backend/.env.prod
        PORT=5173
        NODE_ENV=production
        GOOGLE_CLOUD_PROJECT=${{ secrets.GCP_PROJECT_ID }}
        BIGQUERY_PROJECT_ID=${{ secrets.GCP_PROJECT_ID }}
        BIGQUERY_DATASET=bigquery-public-data.google_cloud_release_notes
        BIGQUERY_TABLE=release_notes
        VERTEXAI_PROJECT_ID=${{ secrets.GCP_PROJECT_ID }}
        VERTEXAI_LOCATION=us-central1
        VERTEXAI_MODEL_ID=gemini-1.5-flash
        RATE_LIMIT_WINDOW_MS=900000
        RATE_LIMIT_MAX_REQUESTS=100
        EOF
        
        # Create frontend .env.production file
        cat <<EOF > frontend/.env.production
        VITE_ENABLE_ANALYTICS=true
        VITE_ENABLE_AI_SUMMARY=true
        VITE_DEFAULT_TIMEFRAME=last_month
        VITE_MAX_PRODUCTS_SELECTION=10
        EOF
        
        # Update package.json to skip TypeScript checks if needed
        sed -i 's/cd frontend && npm run build/cd frontend \&\& npm run build:no-check/g' cloudbuild.yaml
    - name: Deploy to Cloud Run
      run: |
        gcloud builds submit --config=cloudbuild.yaml .
```

## Troubleshooting

### Common Issues and Solutions

1. **TypeScript Build Errors**
   - If you encounter build errors related to TypeScript during Docker build, there are two approaches:
     - **Recommended for Production:** Fix the TypeScript errors in the frontend code
     - **Quick Workaround for Testing:** Use the `build:no-check` script by modifying the Dockerfile:
       ```diff
       # Build frontend
       - RUN cd frontend && npm run build
       + RUN cd frontend && npm run build:no-check
       ```
   - Common TypeScript errors include:
     - Unused imports (TS6133)
     - Type mismatches in React components (TS2322)
     - Missing properties in component props (TS2339)
   - A common issue is also with the `bigquery.service.ts` file where the BigQuery initialization may reference incorrect config properties. Ensure your config structure in `src/config/index.ts` matches the environment variables you've set.

2. **Environment Variables Issues**
   - Check if all required environment variables are correctly set in both backend/.env and frontend/.env.production
   - Verify that the Dockerfile is correctly copying these files

3. **Container Build Failures**
   - **Same File Copy Error**: If you see an error like `cp: 'backend/.env' and 'backend/.env' are the same file`, it means your Docker build arguments are pointing to the same file as the destination. Make sure you use different file paths:
     ```bash
     docker build --build-arg BACKEND_ENV_FILE=backend/.env.prod \
                  --build-arg FRONTEND_ENV_FILE=frontend/.env.production \
                  -t gcp-release-notes-dashboard:local .
     ```
   - Check Docker errors in the build logs
   - Ensure all files are included in the Docker build context
   - Verify NODE_ENV is set to production for the production build

4. **Cloud Run Deployment Failures**
   - Verify service account permissions
   - Check for quota limitations
   - Ensure the container port (5173) matches the port your application listens on

5. **API Connection Issues**
   - Verify that BigQuery and Vertex AI APIs are enabled
   - Check service account permissions for these services

## Monitoring and Maintenance

### Monitoring the Deployed Service
1. View Cloud Run logs:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gcp-release-notes-dashboard"
   ```

2. Set up alerting for errors:
   ```bash
   gcloud alpha monitoring channels create --display-name="Email Alert" --type=email --channel-labels=email_address=your-email@example.com
   ```

### Updating Deployed Service
1. Make code changes
2. Build and test locally
3. Push the changes to GitHub if using GitHub Actions, or manually rebuild and deploy

### Scaling Configuration
1. Adjust instance limits:
   ```bash
   gcloud run services update gcp-release-notes-dashboard \
     --min-instances=1 \
     --max-instances=20
   ```

2. Modify memory and CPU allocation:
   ```bash
   gcloud run services update gcp-release-notes-dashboard \
     --memory=1Gi \
     --cpu=2
   ```

## Quick Reference Commands

### Build and Deploy
```bash
# Local build and test
npm run install:all
npm run build
npm start

# Manual deployment
docker build -t gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest .
docker push gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest
gcloud run deploy gcp-release-notes-dashboard --image=gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard:latest --region=us-central1 --platform=managed --allow-unauthenticated --port=5173

# Cloud Build deployment
gcloud builds submit --config=cloudbuild.yaml .
```

### Monitoring
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gcp-release-notes-dashboard"

# Get service URL
gcloud run services describe gcp-release-notes-dashboard --platform=managed --region=us-central1 --format='value(status.url)'
``` 