import dotenv from 'dotenv';

dotenv.config();

// Log loaded environment variables for debugging
console.log('Loaded environment variables:');
console.log('GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT);
console.log('BIGQUERY_DATASET:', process.env.BIGQUERY_DATASET);
console.log('BIGQUERY_TABLE:', process.env.BIGQUERY_TABLE);
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set (masked)' : 'Not set');
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL || 'Not set');

// Define valid Gemini models 
const VALID_GEMINI_MODELS = [
  // Core models - always stable
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-pro',
  'gemini-pro-vision',
  // Experimental models - may have issues
  'gemini-2.5-pro-exp-03-25',
  'gemini-2.0-flash'
];

// Define stable fallback model
const FALLBACK_MODEL = 'gemini-1.5-pro';

// Check if Gemini API key is set
if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set in environment variables');
  console.error('AI summary generation will not work without a valid API key');
}

// Check if Gemini model is set
if (!process.env.GEMINI_MODEL) {
  console.error('ERROR: GEMINI_MODEL is not set in environment variables');
  console.error(`Using default fallback model: ${FALLBACK_MODEL}`);
}

// Get model from environment without default fallback
let geminiModel = process.env.GEMINI_MODEL;

// If model is not provided, use the fallback
if (!geminiModel) {
  console.warn(`No Gemini model specified - using default model: ${FALLBACK_MODEL}`);
  geminiModel = FALLBACK_MODEL;
} else {
  // Check if the specified model is in our valid list
  const isKnownModel = VALID_GEMINI_MODELS.includes(geminiModel);

  // Support experimental/preview models even if not in our list
  const isExperimentalModel = geminiModel.startsWith('gemini-2.') || 
                            geminiModel.includes('-exp-') || 
                            geminiModel.includes('-preview-');

  if (!isKnownModel && !isExperimentalModel) {
    console.warn(`Warning: Model "${geminiModel}" is not in the list of known models.`);
    console.warn('The API may return an error if this model doesn\'t exist.');
  } else {
    console.log(`Using Gemini model: ${geminiModel}`);
    if (isExperimentalModel) {
      console.log(`Note: ${geminiModel} is an experimental model which may be unstable.`);
      console.log(`If it fails, the app will fall back to ${FALLBACK_MODEL}.`);
    }
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
    fallbackModel: FALLBACK_MODEL
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