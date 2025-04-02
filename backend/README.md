# GCP Release Notes Dashboard - Backend

The backend service for the GCP Release Notes Dashboard, providing API endpoints for fetching and analyzing GCP release notes.

## Features

- Fetch release notes from BigQuery
- Filter release notes by timeframe, type, and product
- AI-powered summarization using Google's Gemini model
- RESTful API endpoints
- TypeScript support
- Docker containerization

## Prerequisites

- Node.js 18 or higher
- Google Cloud Platform account
- Service account with appropriate permissions
- Gemini API key

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# BigQuery Configuration
BIGQUERY_DATASET=google_cloud_release_notes
BIGQUERY_TABLE=release_notes

# Vertex AI (Gemini) Configuration
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173

# Cache Configuration
CACHE_TTL=3600 # 1 hour in seconds
```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

## Development

Start the development server:
```bash
npm run dev
```

The server will start on port 3001 (or the port specified in your .env file).

## API Endpoints

### GET /api/release-notes

Fetch release notes with optional filtering and summarization.

Query Parameters:
- `timeframe`: 'recent' | 'last_month' | 'last_quarter'
- `types`: Comma-separated list of release note types
- `products`: Comma-separated list of product names
- `summarize`: boolean (default: true)

### GET /api/meta/products

Get a list of distinct product names.

### GET /api/meta/types

Get a list of distinct release note types.

### GET /health

Health check endpoint.

## Docker

Build the Docker image:
```bash
docker build -t gcp-release-notes-api .
```

Run the container:
```bash
docker run -p 3001:3001 --env-file .env gcp-release-notes-api
```

## Deployment

The service is designed to be deployed to Google Cloud Run. Follow these steps:

1. Build and push the Docker image to Google Container Registry:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/gcp-release-notes-api
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy gcp-release-notes-api \
     --image gcr.io/[PROJECT_ID]/gcp-release-notes-api \
     --platform managed \
     --region [REGION] \
     --allow-unauthenticated \
     --set-env-vars="GOOGLE_CLOUD_PROJECT=[PROJECT_ID]"
   ```

## Testing

Run tests:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
