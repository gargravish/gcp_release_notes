# GCP Release Notes Dashboard - Frontend

The frontend application for the GCP Release Notes Dashboard, providing an interactive interface for exploring and analyzing GCP release notes.

## Features

- Modern, responsive UI built with React and Material UI
- Real-time filtering of release notes
- AI-powered summarization display
- Markdown rendering with link support
- TypeScript support
- Efficient state management with Zustand
- Data fetching with TanStack Query

## Prerequisites

- Node.js 18 or higher
- Backend service running (see backend README)

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Feature Flags
VITE_ENABLE_AI_SUMMARIZATION=true
VITE_ENABLE_CACHING=true

# UI Configuration
VITE_DEFAULT_TIMEFRAME=last_month
VITE_DEFAULT_PRODUCTS=BigQuery,Cloud Composer,Pub/Sub,Dataflow,Dataproc,Dataplex,Vertex AI,Kafka,Data Fusion
VITE_DEFAULT_TYPES=FEATURE,SERVICE_ANNOUNCEMENT

# Cache Configuration
VITE_CACHE_DURATION=3600 # 1 hour in seconds
```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

## Development

Start the development server:
```bash
npm run dev
```

The application will start on port 5173 (or the next available port).

## Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/         # React components
│   ├── FilterPanel.tsx
│   ├── Layout.tsx
│   ├── ReleaseNotesList.tsx
│   └── SummaryPanel.tsx
├── services/          # API and other services
│   └── api.ts
├── store/            # State management
│   └── useStore.ts
├── types/            # TypeScript type definitions
│   └── api.ts
├── theme.ts          # Material UI theme configuration
├── App.tsx           # Main application component
└── main.tsx          # Application entry point
```

## Deployment

The frontend is designed to be deployed to Google Cloud Storage. Follow these steps:

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Cloud Storage:
   ```bash
   gsutil cp -r dist/* gs://[BUCKET_NAME]/
   ```

3. Configure Cloud Storage for web hosting:
   ```bash
   gsutil iam ch allUsers:objectViewer gs://[BUCKET_NAME]
   gsutil web set -m index.html gs://[BUCKET_NAME]
   ```

4. (Optional) Set up Cloud CDN for better performance:
   ```bash
   gcloud compute url-maps create [URL_MAP_NAME] \
     --default-backend-bucket=[BUCKET_NAME]
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
