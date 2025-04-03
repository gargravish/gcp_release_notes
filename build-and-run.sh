#!/bin/bash

# Get the external IP (just for displaying access URL)
EXTERNAL_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
if [ -z "$EXTERNAL_IP" ]; then
  echo "Could not detect external IP, defaulting to localhost"
  EXTERNAL_IP="localhost"
fi

# Verify backend environment file
if [ ! -f "backend/.env.prod" ]; then
  echo "ERROR: backend/.env.prod file not found. Please create it before building."
  echo "You can copy backend/.env.example to backend/.env.prod and modify it."
  exit 1
else
  echo "Found backend/.env.prod file. Checking for required values..."
  
  # Check for BigQuery settings
  grep -q "BIGQUERY_DATASET" backend/.env.prod || echo "WARNING: BIGQUERY_DATASET not found in backend/.env.prod"
  echo "Using the following BigQuery settings:"
  grep "BIGQUERY" backend/.env.prod
  
  # Check for Gemini API settings
  grep -q "GEMINI_API_KEY" backend/.env.prod || echo "WARNING: GEMINI_API_KEY not found in backend/.env.prod"
  echo "Using the following Gemini API settings:"
  grep "GEMINI" backend/.env.prod
  
  # Extract the Gemini API key for Docker build
  GEMINI_API_KEY=$(grep "GEMINI_API_KEY" backend/.env.prod | cut -d'=' -f2)
  if [ -z "$GEMINI_API_KEY" ]; then
    echo "ERROR: GEMINI_API_KEY not found or empty in backend/.env.prod"
    exit 1
  fi
  
  # Extract Gemini model
  GEMINI_MODEL=$(grep "GEMINI_MODEL" backend/.env.prod | cut -d'=' -f2)
  if [ -z "$GEMINI_MODEL" ]; then
    echo "WARNING: GEMINI_MODEL not found in backend/.env.prod, using standard model"
    GEMINI_MODEL="gemini-1.5-pro"
  fi
  
  # Validate Gemini model
  case "$GEMINI_MODEL" in
    # Standard models
    "gemini-1.5-pro"|"gemini-1.5-flash"|"gemini-1.0-pro"|"gemini-pro"|"gemini-pro-vision"|\
    # Experimental models
    "gemini-2.5-pro-exp-03-25"|"gemini-2.0-flash")
      echo "Using Gemini model: $GEMINI_MODEL"
      ;;
    *)
      echo "WARNING: '$GEMINI_MODEL' might not be a valid model name, but we'll try to use it anyway."
      echo "If you encounter errors, try falling back to a standard model like gemini-1.5-pro"
      ;;
  esac
fi

# Stop any running containers
echo "Stopping any running containers..."
docker stop $(docker ps -q --filter ancestor=gcp-release-notes-dashboard:local) 2>/dev/null || true

# Build the Docker image
echo "Building Docker image with backend/.env.prod..."
docker build \
  --build-arg BACKEND_ENV_FILE=backend/.env.prod \
  --build-arg GEMINI_API_KEY="$GEMINI_API_KEY" \
  --build-arg GEMINI_MODEL="$GEMINI_MODEL" \
  -t gcp-release-notes-dashboard:local .

# Run the container with environment variables
echo "Starting container..."
docker run -d -p 5173:5173 \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e GEMINI_MODEL="$GEMINI_MODEL" \
  gcp-release-notes-dashboard:local

# Test container health and configuration
echo "Waiting for container to start..."
sleep 5
CONTAINER_ID=$(docker ps -q --filter ancestor=gcp-release-notes-dashboard:local)
if [ -z "$CONTAINER_ID" ]; then
  echo "ERROR: Container failed to start. Check docker logs."
else
  echo "Container started with ID: $CONTAINER_ID"
  echo "Checking environment variables in container..."
  docker exec $CONTAINER_ID env | grep -E "BIGQUERY|GEMINI"
  echo "Testing API endpoint..."
  curl -s http://localhost:5173/api/health || echo "Health endpoint not accessible."
fi

# Print success message
echo "=================================================="
echo "Application is now running!"
echo -e "\033[1;33mIMPORTANT: Access using HTTP only (not HTTPS):\033[0m"
echo -e "\033[1;32mhttp://$EXTERNAL_IP:5173\033[0m"
echo "=================================================="
echo "NOTE: The application will work on ANY machine or IP address"
echo "      The URL above is just for your convenience"
echo "=================================================="
echo "If you see SSL errors in your browser, make sure:"
echo "1. You're using http:// (not https://) in the URL"
echo "2. Try clearing your browser cache or use incognito mode"
echo "3. Some browsers may force HTTPS - try a different browser"
echo "=================================================="
echo "If you see database errors or the 'Failed to load release notes' message:"
echo "1. Check if your BigQuery dataset exists: $BIGQUERY_DATASET"
echo "2. Verify permissions and project access"
echo "3. Check Docker logs: docker logs $CONTAINER_ID"
echo "==================================================" 