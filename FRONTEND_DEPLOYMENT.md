# Frontend Deployment Guide for GCP Release Notes Dashboard

This guide provides step-by-step instructions for deploying the frontend of the GCP Release Notes Dashboard to Google Cloud Run.

## Prerequisites

- Backend is already deployed and running on Cloud Run
- Google Cloud CLI (`gcloud`) installed and configured
- Docker installed locally

## 1. Set Up TypeScript Configuration

Before deployment, ensure you have the correct TypeScript configuration files in your frontend directory:

1. Create a `tsconfig.json` file:
   ```bash
   cat > tsconfig.json << 'EOF'
   {
     "compilerOptions": {
       "target": "ES2020",
       "useDefineForClassFields": true,
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "skipLibCheck": true,
       "moduleResolution": "bundler",
       "allowImportingTsExtensions": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "jsx": "react-jsx",
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true,
       "allowSyntheticDefaultImports": true,
       "esModuleInterop": true,
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"]
       }
     },
     "include": ["src"],
     "references": [{ "path": "./tsconfig.node.json" }]
   }
   EOF
   ```

2. Create a `tsconfig.node.json` file:
   ```bash
   cat > tsconfig.node.json << 'EOF'
   {
     "compilerOptions": {
       "composite": true,
       "skipLibCheck": true,
       "module": "ESNext",
       "moduleResolution": "bundler",
       "allowSyntheticDefaultImports": true
     },
     "include": ["vite.config.ts"]
   }
   EOF
   ```

3. Update the build script in `package.json` to use `--noEmit` flag with TypeScript:
   ```bash
   sed -i 's/"build": "tsc && vite build"/"build": "tsc --noEmit && vite build"/' package.json
   ```

## 2. Configure Environment Variables

1. Create a `.env.production` file with the backend URL:
   ```bash
   # Get the deployed backend URL
   BACKEND_URL=$(gcloud run services describe gcp-release-notes-backend \
     --platform=managed \
     --region=us-central1 \
     --format='value(status.url)')
   
   # Create the production environment file
   cat > .env.production << EOF
   VITE_API_URL=$BACKEND_URL
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_AI_SUMMARY=true
   VITE_DEFAULT_TIMEFRAME=last_month
   VITE_MAX_PRODUCTS_SELECTION=10
   EOF
   ```

## 3. Verify Dockerfile Setup

Ensure your `Dockerfile` includes the TypeScript configuration setup:

```dockerfile
# Build stage
FROM node:20-alpine as build

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create tsconfig.json if it doesn't exist
RUN if [ ! -f "tsconfig.json" ]; then echo '{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}' > tsconfig.json; fi

# Create tsconfig.node.json if it doesn't exist
RUN if [ ! -f "tsconfig.node.json" ]; then echo '{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}' > tsconfig.node.json; fi

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from the build stage
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

## 4. Build and Deploy

### 4.1 Manual Deployment

1. Build the Docker image:
   ```bash
   docker build -t gcr.io/raves-altostrat/gcp-release-notes-frontend:latest .
   ```

2. Push the image to Google Container Registry:
   ```bash
   docker push gcr.io/raves-altostrat/gcp-release-notes-frontend:latest
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy gcp-release-notes-frontend \
     --image=gcr.io/raves-altostrat/gcp-release-notes-frontend:latest \
     --region=us-central1 \
     --platform=managed \
     --allow-unauthenticated \
     --memory=256Mi \
     --cpu=1 \
     --min-instances=0 \
     --max-instances=5 \
     --port=80
   ```

### 4.2 Automated Deployment with Cloud Build

1. Trigger the Cloud Build:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml .
   ```

## 5. Verify the Deployment

1. Get the deployed frontend URL:
   ```bash
   FRONTEND_URL=$(gcloud run services describe gcp-release-notes-frontend \
     --platform=managed \
     --region=us-central1 \
     --format='value(status.url)')
   
   echo "Frontend URL: $FRONTEND_URL"
   ```

2. Open the frontend URL in a browser to verify the application is working correctly.

## 6. Troubleshooting

### Common Build Issues

1. **TypeScript Compilation Errors**
   - Ensure you have the correct TypeScript configuration files (`tsconfig.json` and `tsconfig.node.json`)
   - Verify that the `build` script in `package.json` uses the `--noEmit` flag with TypeScript
   - Check for type errors in your code and fix them before deploying

2. **Docker Build Fails**
   - Check if the Dockerfile is properly configured to handle TypeScript compilation
   - Verify that all required files are being copied into the Docker image
   - Try building with a verbose flag for more detailed error messages:
     ```bash
     docker build --progress=plain -t gcr.io/raves-altostrat/gcp-release-notes-frontend:latest .
     ```

3. **Nginx Configuration Issues**
   - Ensure your `nginx.conf` is properly set up to serve a React app (with history API fallback)
   - Verify that the static files are being copied to the correct location in the Nginx image

4. **Environment Variable Issues**
   - Check that your `.env.production` file contains the correct variables
   - Verify that the backend URL is correct and accessible
   - Try logging environment variables in your app to debug issues

5. **API Connection Issues**
   - If the frontend can't connect to the backend, check CORS configuration on the backend
   - Verify that the backend service is publicly accessible
   - Try accessing the backend API endpoints directly to ensure they're working

### Quick Fixes

1. **For TypeScript build errors**:
   ```bash
   # Fix package.json build script
   sed -i 's/"build": "tsc && vite build"/"build": "tsc --noEmit && vite build"/' package.json
   
   # Create TypeScript configuration files
   # (See instructions in Section 1)
   ```

2. **For Docker build errors**:
   ```bash
   # Build with verbose output
   docker build --progress=plain -t gcr.io/raves-altostrat/gcp-release-notes-frontend:latest .
   ```

3. **For environment variable issues**:
   ```bash
   # Manually set environment variables in Cloud Run
   gcloud run services update gcp-release-notes-frontend \
     --set-env-vars="VITE_API_URL=https://gcp-release-notes-backend-xxxxx-uc.a.run.app"
   ``` 