#!/bin/bash

# Configuration
IMAGE_NAME="gcp-release-notes-dashboard"
CONTAINER_NAME="gcp-release-notes-dashboard"
PORT="5173"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print section header
print_header() {
  echo -e "\n${YELLOW}===== $1 =====${NC}\n"
}

# Print success message
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Print error message
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Check if a command exists
check_command() {
  if ! command -v $1 &> /dev/null; then
    print_error "$1 is required but not installed. Please install it first."
    exit 1
  fi
}

# Check for required commands
check_command "docker"

# Stop and remove existing container if running
print_header "Checking for existing container"
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
  echo "Stopping existing container: $CONTAINER_NAME"
  docker stop $CONTAINER_NAME
fi

if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
  echo "Removing existing container: $CONTAINER_NAME"
  docker rm $CONTAINER_NAME
fi

# Build the Docker image
print_header "Building Docker image"
docker build \
  --build-arg BACKEND_ENV_FILE=backend/.env.prod \
  --build-arg FRONTEND_ENV_FILE=frontend/.env.production \
  -t $IMAGE_NAME .

# Check if build was successful
if [ $? -ne 0 ]; then
  print_error "Docker build failed. See error messages above."
  exit 1
fi

print_success "Docker image built successfully"

# Verify the image was created
if [[ "$(docker images -q $IMAGE_NAME 2> /dev/null)" == "" ]]; then
  print_error "Image was not created successfully."
  exit 1
fi

# Run a diagnostic check on the built image
print_header "Running diagnostics on built image"
docker run --rm $IMAGE_NAME find /usr/src/app/public -type f | sort

# Run the container
print_header "Starting container"
docker run \
  --name $CONTAINER_NAME \
  -p $PORT:$PORT \
  -e PORT=$PORT \
  -e NODE_ENV=production \
  -d \
  $IMAGE_NAME

# Check if container started successfully
if [ $? -ne 0 ]; then
  print_error "Failed to start container."
  exit 1
fi

print_success "Container started successfully"

# Get container logs
print_header "Container logs (first 20 lines)"
docker logs $CONTAINER_NAME --tail 20

# Print access information
print_header "Access Information"
echo "The application is now running."
echo "Local access: http://localhost:$PORT"
echo ""
echo "For Cloud Run, deploy with:"
echo "gcloud run deploy gcp-release-notes-dashboard \\"
echo "  --image gcr.io/YOUR_PROJECT_ID/$IMAGE_NAME \\"
echo "  --platform managed \\"
echo "  --region us-central1 \\"
echo "  --allow-unauthenticated \\"
echo "  --port $PORT"
echo ""
echo "To test endpoints:"
echo "- Main application: http://localhost:$PORT/"
echo "- Static test page: http://localhost:$PORT/static-test"
echo "- Debug endpoint: http://localhost:$PORT/debug"
echo "- Test endpoint: http://localhost:$PORT/test"
echo "- Static file test: http://localhost:$PORT/static-file-test/index.html"
echo ""
echo "If the application doesn't work in Cloud Run but works locally:"
echo "1. Check that the public directory is correctly copied to the container"
echo "2. Verify that the frontend assets are built and placed in backend/public"
echo "3. Check the Cloud Run logs for any errors"
echo "4. Try visiting /static-test, /debug, and /test to diagnose issues"

# Add instructions for debugging Cloud Run
print_header "Debugging Cloud Run"
echo "If the app is deployed to Cloud Run but not working:"
echo "1. Check the Cloud Run logs for errors"
echo "2. Visit https://YOUR-APP-URL/static-test to verify server is running"
echo "3. Visit https://YOUR-APP-URL/debug to check frontend file availability"
echo "4. If index.html exists but assets are missing, rebuild with better debugging"
echo "5. Use the diagnostic endpoints to identify the specific issue" 