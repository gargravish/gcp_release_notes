# Local Development Guide

This guide provides instructions for setting up and running the GCP Release Notes Dashboard application in a local development environment.

## Prerequisites

- Node.js 18+ and npm
- Git
- Access to Google Cloud services (if using real data)
- Gemini API key for AI summarization features

## Quick Start

We've created a one-step setup process that handles all dependencies and configuration:

```bash
# Install dependencies and set up configuration
npm run setup

# Start both frontend and backend in development mode
npm run dev
```

The application will be available at:
- Frontend + Backend: http://localhost:5173

## Manual Setup

If you prefer to set up manually or if the automatic setup doesn't work, follow these steps:

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 2. Configure Environment Variables

#### Backend Configuration

Create a `.env` file in the `backend` directory:

```bash
cp backend/.env.example backend/.env
```

Edit the file to include your actual credentials:

```
# Server configuration
PORT=3001
NODE_ENV=development

# CORS configuration (for local development)
ALLOWED_ORIGINS=http://localhost:5173

# Google Cloud configuration
GOOGLE_CLOUD_PROJECT=your-project-id
# For local development, you may need to specify credentials
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# BigQuery configuration
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET=raves_us
BIGQUERY_TABLE=release_notes

# Gemini API Settings
GEMINI_API_KEY=YOUR_API_KEY_HERE
GEMINI_MODEL=gemini-1.5-pro
```

#### Frontend Configuration

Create a `.env` file in the `frontend` directory:

```bash
cp frontend/.env.example frontend/.env
```

The default settings should work for local development.

### 3. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start them separately
npm run dev:backend
npm run dev:frontend
```

## Common Issues and Solutions

### Missing Dependencies

If you encounter errors about missing dependencies like `axios`:

```bash
cd backend
npm install axios
```

### API Connection Issues

If the frontend can't connect to the backend API:

1. Ensure the backend server is running
2. Check that the frontend Vite config has the correct proxy settings
3. Verify that CORS is properly configured in the backend

#### Running on Separate Ports

If you encounter port conflicts, you can run the backend and frontend on separate ports:

```bash
# This runs the backend on port 3001 and frontend on port 5173
npm run dev:separate
```

If you do this, you'll need to update your frontend Vite config:
- Open `frontend/vite.config.ts`
- Set the proxy target to `http://localhost:3001`

### Gemini API Issues

If AI summarization isn't working:

1. Ensure you have a valid Gemini API key in `backend/.env`
2. Make sure the GEMINI_MODEL is set to a valid model (e.g., `gemini-1.5-pro`)
3. Check the backend logs for API error messages

## Docker Development

You can also use Docker for development:

```bash
# Build and run using the provided script
./build-and-run.sh
```

The application will be available at http://localhost:5173.

## Project Structure

- `/backend` - Express.js backend with TypeScript
- `/frontend` - React frontend with TypeScript, Vite, and MUI
- `/scripts` - Helper scripts for development and deployment

## Working with the Code

- Backend code is in `backend/src`
- Frontend code is in `frontend/src`
- Main React components are in `frontend/src/components`
- API service is in `frontend/src/services`
- State management is in `frontend/src/store`

## Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

## Building for Production

```bash
npm run build
```

This will:
1. Build the frontend
2. Build the backend
3. Copy frontend assets to the backend's public directory

The complete application will be available in the `backend/dist` and `backend/public` directories.

## Troubleshooting

### "Cannot find module 'axios'"

```bash
cd backend
npm install axios
```

### "Error: listen EADDRINUSE: address already in use :::5173"

Another process is using port 5173. Either kill that process or change the port in:
- `backend/.env` (PORT variable)
- `frontend/vite.config.ts` (server.port)

### "Failed to generate summary using Gemini"

Check that:
1. Your Gemini API key is correctly set in `backend/.env`
2. You're using a valid model name
3. Your Google Cloud project has the necessary API enabled 