# GCP Release Notes Dashboard Troubleshooting Guide

This document provides guidance on troubleshooting common deployment issues with the GCP Release Notes Dashboard, particularly focusing on asset serving problems when deploying to Cloud Run.

## Common Issues and Solutions

### 1. Frontend Assets Not Loading in Cloud Run

#### Symptoms:
- The application's static test page (`/static-test`) loads correctly
- Diagnostic endpoints (`/debug`, `/test`, `/check-assets`) work properly
- The main application page (root URL) fails to load properly or doesn't display correctly
- Browser console shows 404 errors for JavaScript or CSS files

#### Root Causes:
1. **Asset Path Mismatch**: The paths referenced in the built HTML don't match the actual paths on the server
2. **Incorrect Build Process**: The frontend build artifacts aren't correctly copied to the backend's public directory
3. **HTTPS/HTTP Issues**: Incorrect Content Security Policy or mixed content issues
4. **File Permission Problems**: Incorrect permissions on static files in the Docker container

#### Solutions:

1. **Use a Dedicated Static Assets Route**:
   ```typescript
   // Add a dedicated route for assets to improve path resolution
   app.use('/assets', express.static(path.join(__dirname, '../public/assets'), {
     maxAge: '1d',
     etag: true,
     lastModified: true,
   }));
   ```

2. **Ensure Proper Asset Copying in Dockerfile**:
   ```dockerfile
   # Create public directory in backend for frontend assets
   RUN mkdir -p backend/public/assets
   
   # Copy frontend build to backend/public with verification
   RUN cp -r frontend/dist/* backend/public/ || { echo "Failed to copy frontend/dist to backend/public"; exit 1; }
   
   # Verify assets directory was copied correctly
   RUN if [ ! -d "backend/public/assets" ]; then mkdir -p backend/public/assets; echo "Creating assets directory that was missing"; fi
   
   # Copy assets directory separately to ensure it exists
   RUN cp -r frontend/dist/assets/* backend/public/assets/ || { echo "Warning: Unable to copy assets directory specifically"; }
   ```

3. **Set Correct Permissions**:
   ```dockerfile
   # Ensure public directory has correct permissions
   RUN chmod -R 755 ./public
   ```

4. **Configure Proper Content Security Policy**:
   ```html
   <!-- In index.html -->
   <meta http-equiv="Content-Security-Policy" content="default-src 'self' https: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:;">
   ```

5. **Add Base URL for Assets**:
   ```html
   <!-- Ensure proper base URL for assets -->
   <base href="/" />
   ```

### 2. Issues with Vite Build Configuration

#### Symptoms:
- Build fails with errors about asset resolution
- Scripts referencing specific asset hashes fail
- Assets aren't generated with the expected paths

#### Solutions:

1. **Configure Vite for Consistent Asset Paths**:
   ```typescript
   // vite.config.ts
   export default defineConfig({
     plugins: [react()],
     build: {
       outDir: 'dist',
       sourcemap: true,
       emptyOutDir: true,
       // Explicitly set asset file names
       assetsDir: 'assets',
       // Ensure assets use correct public path
       rollupOptions: {
         output: {
           entryFileNames: 'assets/[name]-[hash].js',
           chunkFileNames: 'assets/[name]-[hash].js',
           assetFileNames: 'assets/[name]-[hash].[ext]'
         }
       }
     },
     base: '/',
   });
   ```

2. **Don't Modify Source HTML During Build**:
   - Let Vite handle asset path injection during build
   - Avoid hardcoding asset paths with specific hashes in the source HTML

### 3. Diagnosing Asset Issues

When facing asset loading problems, use these diagnostic endpoints included in the application:

1. **Static Test Page** - `/static-test`
   - Confirms the server is running correctly
   - Provides direct links to diagnostic endpoints

2. **Debug Endpoint** - `/debug`
   - Shows available frontend files
   - Lists server configuration details

3. **Test Endpoint** - `/test`
   - Checks for presence of index.html and asset directory
   - Lists available asset files

4. **Check Assets Endpoint** - `/check-assets`
   - Detailed information about assets, including file sizes and paths
   - Shows HTML file references and their resolution status
   - Lists all configured routes

5. **Static File Test** - `/static-file-test/:filename`
   - Tests specific file accessibility
   - Example: `/static-file-test/index.html`

## Deployment Checklist

Before deploying to Cloud Run, verify:

1. **Local Build**: Test the Docker build locally first:
   ```bash
   docker build --build-arg BACKEND_ENV_FILE=backend/.env.prod --build-arg FRONTEND_ENV_FILE=frontend/.env.production -t gcp-release-notes-dashboard:local .
   ```

2. **Local Test**: Run and test the container locally:
   ```bash
   docker run -p 5173:5173 gcp-release-notes-dashboard:local
   ```

3. **Verify Assets**: Check asset serving locally at `http://localhost:5173`

4. **Deploy to Cloud Run**: Use standard gcloud commands:
   ```bash
   gcloud run deploy gcp-release-notes-dashboard \
     --image gcr.io/YOUR_PROJECT_ID/gcp-release-notes-dashboard \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 5173
   ```

5. **Verify Endpoints**: After deployment, check the diagnostic endpoints:
   - `/static-test` - Should display with correct links
   - `/debug` - Should show all frontend files present
   - `/check-assets` - Should confirm asset resolution

## Advanced Troubleshooting

### Viewing Cloud Run Container Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gcp-release-notes-dashboard" --limit=50
```

### Inspecting Container in Cloud Run

Use the diagnostic endpoints to understand the runtime environment:

1. `/debug` - View container environment variables
2. `/check-assets` - Examine the generated HTML and asset references

### Testing File Serving Directly

To bypass the normal routing and test a specific file:

```
https://YOUR-APP-URL/static-file-test/assets/YOUR-ASSET-FILE
```

## Key Lessons Learned

1. **Build Process Matters**: The build process must correctly copy all frontend assets to their expected locations.

2. **Asset Path Consistency**: Maintain consistent paths between development and production environments.

3. **Diagnostic Endpoints**: Always include diagnostic endpoints in your application for easy troubleshooting.

4. **Content Security Policy**: Properly configure CSP to ensure assets can be loaded from the expected sources.

5. **Layer-by-Layer Testing**: Test each layer (build, asset copying, serving) separately to isolate issues.

6. **Avoid Hardcoded Hashes**: Don't reference specific asset hashes in source files - they change with each build. 