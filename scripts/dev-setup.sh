#!/bin/bash

# Script to ensure all dependencies are installed before starting local development

# Exit on error
set -e

echo "=== Setting up local development environment ==="

# Navigate to project root directory
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "Project root: $PROJECT_ROOT"

# Check for required dependencies
echo "Checking for required dependencies..."

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
if ! command_exists node; then
  echo "Error: Node.js is not installed. Please install Node.js and npm first."
  exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies at the project root
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd "$PROJECT_ROOT/backend"
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend"
npm install

# Back to project root
cd "$PROJECT_ROOT"

# Verify environment files
echo "Checking environment files..."

# Check for backend .env file
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
  if [ -f "$PROJECT_ROOT/backend/.env.example" ]; then
    echo "Creating backend/.env from .env.example..."
    cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
    echo "Please remember to update the backend/.env file with your actual credentials."
  else
    echo "Warning: No backend/.env.example file found."
    echo "Creating a minimal .env file..."
    cat > "$PROJECT_ROOT/backend/.env" << EOF
# Server configuration
PORT=5173
NODE_ENV=development

# Google Cloud configuration
GOOGLE_CLOUD_PROJECT=your-project-id

# BigQuery configuration
BIGQUERY_DATASET=raves_us
BIGQUERY_TABLE=release_notes

# Gemini API Settings - YOU MUST SET YOUR API KEY HERE
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-pro
EOF
    echo "Please update the backend/.env file with your actual credentials."
  fi
fi

# Check for frontend .env file
if [ ! -f "$PROJECT_ROOT/frontend/.env" ]; then
  if [ -f "$PROJECT_ROOT/frontend/.env.example" ]; then
    echo "Creating frontend/.env from .env.example..."
    cp "$PROJECT_ROOT/frontend/.env.example" "$PROJECT_ROOT/frontend/.env"
  else
    echo "Warning: No frontend/.env.example file found."
    echo "Creating a minimal .env file..."
    cat > "$PROJECT_ROOT/frontend/.env" << EOF
# The API URL for local development
VITE_API_URL=http://localhost:5173
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_AI_SUMMARY=true
VITE_DEFAULT_TIMEFRAME=7d
VITE_MAX_PRODUCTS_SELECTION=10
EOF
  fi
fi

echo "Setup completed successfully."
echo ""
echo "To start development servers, run: npm run dev"
echo "Backend will be available at: http://localhost:5173"
echo "Frontend will be available at: http://localhost:5173 (with API proxied to backend)"
echo ""
echo "Remember to set your GEMINI_API_KEY in backend/.env" 