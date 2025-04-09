import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ReleaseNotesController } from './controllers/release-notes.controller';
import { config } from './config';
import dotenv from 'dotenv';
import path from 'path';
import { VisitorCounterController } from './controllers/visitor-counter.controller';

const app = express();
const controller = new ReleaseNotesController();
const visitorCounterController = new VisitorCounterController();

// Middleware to handle HTTPS redirects correctly for Cloud Run
app.use((req, res, next) => {
  // Cloud Run sets this header
  const forwardedProto = req.headers['x-forwarded-proto'];
  
  // Only redirect if not already HTTPS and not a health check
  if (forwardedProto === 'http' && req.path !== '/health') {
    const httpsUrl = `https://${req.headers.host}${req.url}`;
    return res.redirect(301, httpsUrl);
  }
  next();
});

// Add headers to prevent caching issues
app.use((req, res, next) => {
  // Prevent caching if that's causing the issue
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
    }
  },
  // Allow both HTTP and HTTPS for Cloud Run
  strictTransportSecurity: false
}));

// Add HTTP header middleware for security
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Security-Policy', "default-src 'self' https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:; style-src 'self' 'unsafe-inline' https: http:; img-src 'self' data: https: http:; connect-src 'self' https: http:;");
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
  max: 500, // limit each IP to 500 requests per windowMs
  // Use a custom key generator that handles IP addresses correctly
  keyGenerator: (req) => {
    // Get the client IP address, which might be from X-Forwarded-For in Cloud Run
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    // In case the IP contains port information, remove it
    return ip.replace(/:\d+[^:]*$/, '');
  },
  // Add the validate option to suppress the warning
  validate: {
    trustProxy: false, // Disable the trustProxy validation since we're handling it correctly with our keyGenerator
  }
});
app.use(limiter);

// Routes
app.get('/api/release-notes', (req, res) => controller.getReleaseNotes(req, res));
app.get('/api/meta/products', (req, res) => controller.getDistinctProducts(req, res));
app.get('/api/meta/types', (req, res) => controller.getDistinctTypes(req, res));

// Visitor Counter Routes
app.post('/api/visitor-counter/increment', (req, res) => visitorCounterController.incrementCounter(req, res));
app.get('/api/visitor-counter', (req, res) => visitorCounterController.getCounter(req, res));

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
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
// Use a more specific trust proxy setting for Cloud Run
// For Cloud Run, we want to trust the Google infrastructure proxies
// but not allow arbitrary client-provided headers
app.set('trust proxy', 1); // Trust the first proxy in Cloud Run
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} in ${config.server.environment} mode`);
}); 