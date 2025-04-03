#!/bin/bash

# Get the external IP (just for displaying access URL)
EXTERNAL_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
if [ -z "$EXTERNAL_IP" ]; then
  echo "Could not detect external IP, defaulting to localhost"
  EXTERNAL_IP="localhost"
fi

# Stop any running containers
echo "Stopping any running containers..."
docker stop $(docker ps -q --filter ancestor=gcp-release-notes-dashboard:local) 2>/dev/null || true

# Build the Docker image
echo "Building Docker image..."
docker build -t gcp-release-notes-dashboard:local .

# Run the container
echo "Starting container..."
docker run -d -p 5173:5173 gcp-release-notes-dashboard:local

# Print success message
echo "=================================================="
echo "Application is now running!"
echo "Access it at: http://$EXTERNAL_IP:5173"
echo "=================================================="
echo "NOTE: The application will work on ANY machine or IP address"
echo "      The URL above is just for your convenience"
echo "==================================================" 