import dotenv from 'dotenv';

dotenv.config();

// Log loaded environment variables for debugging
console.log('Loaded environment variables:');
console.log('GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT);
console.log('BIGQUERY_DATASET:', process.env.BIGQUERY_DATASET);
console.log('BIGQUERY_TABLE:', process.env.BIGQUERY_TABLE);
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set (masked)' : 'Not set');
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL);

export const config = {
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  bigquery: {
    dataset: process.env.BIGQUERY_DATASET || 'google_cloud_release_notes',
    table: process.env.BIGQUERY_TABLE || 'release_notes',
  },
  vertexAI: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-pro-exp-03-25',
  },
  server: {
    port: parseInt(process.env.PORT || '5173', 10),
    environment: process.env.NODE_ENV || 'development',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
  },
}; 