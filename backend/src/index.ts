import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ReleaseNotesController } from './controllers/release-notes.controller';
import { config } from './config';
import dotenv from 'dotenv';
import path from 'path';

const app = express();
const controller = new ReleaseNotesController();

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'", "http:"],
      imgSrc: ["'self'", "data:", "http:"],
      connectSrc: ["'self'", "http:"],
    }
  },
  // Disable HSTS to prevent HTTPS upgrading
  strictTransportSecurity: false
}));

// Add HTTP header middleware to disable HTTPS upgrading
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Security-Policy', "default-src 'self' http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http:; style-src 'self' 'unsafe-inline' http:; img-src 'self' data: http:; connect-src 'self' http:;");
  next();
});

// Configure CORS to allow any origin
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.get('/api/release-notes', (req, res) => controller.getReleaseNotes(req, res));
app.get('/api/meta/products', (req, res) => controller.getDistinctProducts(req, res));
app.get('/api/meta/types', (req, res) => controller.getDistinctTypes(req, res));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../public')));

// All remaining requests return the React app, so it can handle routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong',
  });
});

// Log environment variables and configuration at startup
console.log('============ ENVIRONMENT SETUP ============');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATASET ENV:', process.env.BIGQUERY_DATASET);
console.log('TABLE ENV:', process.env.BIGQUERY_TABLE);
console.log('DATASET CONFIG:', config.bigquery.dataset);
console.log('TABLE CONFIG:', config.bigquery.table);
console.log('PROJECT ID:', config.googleCloud.projectId);
console.log('CORS ALLOWED ORIGINS:', config.cors.allowedOrigins);
console.log('==========================================');

// Start server
const port = config.server.port;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} in ${config.server.environment} mode`);
}); 