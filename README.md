# GCP Release Notes Interactive Dashboard

A modern, interactive web application that allows users to efficiently explore, filter, summarize, and understand Google Cloud Platform (GCP) release notes.

## Features

- **Interactive Filtering:**
  - Filter by timeframe (Recent, Last Month, Last Quarter)
  - Filter by release note type (SERVICE_ANNOUNCEMENT, FEATURE, etc.)
  - Filter by product name (BigQuery, Cloud Composer, Pub/Sub, etc.)
- **Data Visualization:**
  - Grouped view by product and type
  - Rendered descriptions with clickable links
- **AI Summarization:**
  - Concise summaries of selected release notes
  - Highlights of key announcements and features
  - Potential cross-product use cases
  - Industry vertical relevance

## Tech Stack

### Frontend
- **Framework:** React with TypeScript
- **Build Tool:** Vite
- **UI Library:** Material UI (MUI)
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Markdown Rendering:** react-markdown with remark-gfm plugin
- **Charts:** Recharts

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Google Cloud Libraries:**
  - @google-cloud/bigquery - For querying release notes data
  - @google-cloud/vertexai - For AI summarization with Gemini
- **Security:** Helmet, Express Rate Limit, CORS

### Data Sources
- BigQuery public table `bigquery-public-data.google_cloud_release_notes.release_notes`
- Google Gemini AI for summarization

## Architecture

- **Unified Full-Stack Application**
- **Frontend:** Single Page Application (SPA) served by Backend
- **Backend:** RESTful API Service that also serves the static frontend files
- **Cloud Services:**
  - BigQuery for data storage and querying
  - Vertex AI for Gemini LLM integration
  - Cloud Run for simplified single deployment

## Getting Started

### Prerequisites
- Node.js (latest LTS version)
- Google Cloud Platform account with:
  - BigQuery access to the public dataset
  - Vertex AI API enabled
  - Service account with appropriate permissions

### Development Setup
1. Install dependencies for the entire project:
   ```bash
   npm run install:all
   ```
2. Set up environment variables:
   - Create `backend/.env` file based on the provided `backend/.env.example`
   - Create `frontend/.env` file based on the provided `frontend/.env.example`
3. Start the development servers (both frontend and backend):
   ```bash
   npm run dev
   ```
   This will start:
   - Backend server on `http://localhost:3001`
   - Frontend development server on `http://localhost:5173`

### Production Build
To build the application for production:
```bash
npm run build
```

This command will:
1. Build the frontend and generate static files
2. Build the backend TypeScript code
3. Copy the frontend static files to be served by the backend

To run the production build locally:
```bash
npm start
```

## Deployment

### Deploying to Google Cloud Run

1. Build the Docker container:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/gcp-release-notes-dashboard
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy gcp-release-notes-dashboard \
     --image gcr.io/[PROJECT_ID]/gcp-release-notes-dashboard \
     --platform managed \
     --allow-unauthenticated
   ```

### Deploying to a VM Instance

1. SSH into your VM instance

2. Clone the repository:
   ```bash
   git clone [REPOSITORY_URL]
   cd Data_Dashboard
   ```

3. Install dependencies and build:
   ```bash
   npm run install:all
   npm run build
   ```

4. Start the application:
   ```bash
   npm start
   ```

5. Alternatively, use Docker:
   ```bash
   docker build -t gcp-release-notes-dashboard .
   docker run -p 8080:8080 gcp-release-notes-dashboard
   ```

## License

[Your License Information]

## Contributors

[Your Contributors Information] 