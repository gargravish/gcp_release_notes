import dotenv from 'dotenv';

dotenv.config();

// Log loaded environment variables for debugging
console.log('Loaded environment variables:');
console.log('GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT);
console.log('BIGQUERY_DATASET:', process.env.BIGQUERY_DATASET);
console.log('BIGQUERY_TABLE:', process.env.BIGQUERY_TABLE);
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set (masked)' : 'Not set');
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL);

// Define valid Gemini models 
const VALID_GEMINI_MODELS = [
  // Core models
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-pro',
  'gemini-pro-vision',
  // Experimental models
  'gemini-2.5-pro-exp-03-25',
  'gemini-2.0-flash'
];

// Validate or default the model
let geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

// Check if the specified model is in our valid list
const isKnownModel = VALID_GEMINI_MODELS.includes(geminiModel);

// Support experimental/preview models even if not in our list
const isExperimentalModel = geminiModel.startsWith('gemini-2.') || 
                           geminiModel.includes('-exp-') || 
                           geminiModel.includes('-preview-');

if (!isKnownModel && !isExperimentalModel) {
  console.warn(`Warning: Model "${geminiModel}" is not in the list of known models. Using "gemini-1.5-pro" as fallback.`);
  geminiModel = 'gemini-1.5-pro';
} else {
  console.log(`Using Gemini model: ${geminiModel}`);
  if (isExperimentalModel) {
    console.log('Note: This is an experimental model and might have different API requirements.');
  }
}

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
    model: geminiModel,
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