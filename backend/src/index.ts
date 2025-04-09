import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ReleaseNotesController } from './controllers/release-notes.controller';
import { config } from './config';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { VisitorCounterController } from './controllers/visitor-counter.controller';

// Add proper type definitions for the file check functions
interface FileInfo {
  path: string;
  size: number;
}

const app = express();
const controller = new ReleaseNotesController();
const visitorCounterController = new VisitorCounterController();

// Middleware to handle HTTPS redirects correctly for Cloud Run
app.use((req, res, next) => {
  // Cloud Run sets this header
  const forwardedProto = req.headers['x-forwarded-proto'];
  
  // Log the request information for debugging (temporary)
  console.log('Request info:', {
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    host: req.headers.host,
    forwardedProto,
    referer: req.headers.referer
  });
  
  // Only redirect if explicitly HTTP (not if undefined or already HTTPS)
  // Also skip redirect for health checks and API requests
  if (forwardedProto === 'http' && 
      req.path !== '/health' && 
      !req.path.startsWith('/api/')) {
    console.log(`Redirecting to HTTPS: ${req.headers.host}${req.url}`);
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
      defaultSrc: ["'self'", "https:", "http:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
      fontSrc: ["'self'", "data:", "https:", "http:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    }
  },
  // Allow both HTTP and HTTPS for Cloud Run
  strictTransportSecurity: false
}));

// Add HTTP header middleware for security
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Remove the duplicate CSP header since we're already setting it with helmet
  // res.setHeader('Content-Security-Policy', "default-src 'self' https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:; style-src 'self' 'unsafe-inline' https: http:; img-src 'self' data: https: http:; connect-src 'self' https: http:;");
  
  // Add X-Content-Type-Options to prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
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

// Debug endpoint to check request and environment information
app.get('/debug', (req, res) => {
  // Check frontend files and log the results
  const frontendFiles: FileInfo[] = [];
  const missingCriticalFiles: string[] = [];
  const publicPath = path.join(__dirname, '../public');
  
  // Function to recursively scan a directory and collect file info
  const scanDirectory = (dir: string): void => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          scanDirectory(filePath);
        } else {
          frontendFiles.push({
            path: filePath.replace(publicPath, ''),
            size: stats.size
          });
        }
      });
    } catch (err) {
      console.error(`Error scanning directory ${dir}:`, err);
    }
  };
  
  // Check if critical files exist
  const checkCriticalFiles = (): void => {
    const criticalFiles = [
      '/index.html',
      '/assets/main.js',
      '/assets/main.css'
    ];
    
    criticalFiles.forEach(file => {
      if (!frontendFiles.some(f => f.path === file)) {
        missingCriticalFiles.push(file);
      }
    });
  };
  
  // Scan frontend files if the public directory exists
  if (fs.existsSync(publicPath)) {
    scanDirectory(publicPath);
    checkCriticalFiles();
  } else {
    missingCriticalFiles.push('public directory not found');
  }
  
  res.json({
    headers: req.headers,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    secure: req.secure,
    hostname: req.hostname,
    publicPath: publicPath,
    publicExists: fs.existsSync(publicPath),
    indexExists: fs.existsSync(path.join(publicPath, 'index.html')),
    frontendFiles: frontendFiles.length,
    missingCriticalFiles: missingCriticalFiles.length > 0 ? missingCriticalFiles : 'None',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    }
  });
});

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../public'), {
  // Set proper caching headers for static assets
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Log the file being served (temporary for debugging)
    console.log('Serving static file:', filePath);
    
    // For JS, CSS and other assets that can be cached
    if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    } else {
      // For HTML files, prevent caching
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// All remaining requests return the React app, so it can handle routing
app.get('*', (req, res, next) => {
  // Skip API and health check routes
  if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/debug') {
    return next();
  }
  
  // Log the request that's being handled by the catch-all route
  console.log('Serving frontend for path:', req.path);
  
  const indexPath = path.join(__dirname, '../public/index.html');
  
  // Check if the index.html file exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('ERROR: Frontend index.html not found at', indexPath);
    res.status(500).send('Server configuration error: Frontend not properly built');
  }
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