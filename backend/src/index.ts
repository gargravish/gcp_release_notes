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
  
  // Check if critical files exist - but be more flexible about asset naming
  const checkCriticalFiles = (): void => {
    // Check for index.html - this must exist
    if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
      missingCriticalFiles.push('/index.html');
    }
    
    // Check for any JavaScript files in assets directory
    const hasJsFiles = frontendFiles.some(f => 
      f.path.startsWith('/assets/') && f.path.endsWith('.js')
    );
    if (!hasJsFiles) {
      missingCriticalFiles.push('JavaScript files in /assets directory');
    }
    
    // Check for any CSS files in assets directory
    const hasCssFiles = frontendFiles.some(f => 
      f.path.startsWith('/assets/') && f.path.endsWith('.css')
    );
    if (!hasCssFiles) {
      missingCriticalFiles.push('CSS files in /assets directory');
    }
    
    // Check for assets directory itself
    if (!fs.existsSync(path.join(publicPath, 'assets'))) {
      missingCriticalFiles.push('/assets directory');
    }
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
    frontendFiles: frontendFiles.map(f => f.path), // Show actual file paths
    missingCriticalFiles: missingCriticalFiles.length > 0 ? missingCriticalFiles : 'None',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    }
  });
});

// Test endpoint to help diagnose frontend routing issues
app.get('/test', (req, res) => {
  // Return diagnostic information instead of redirecting to frontend
  const indexPath = path.join(__dirname, '../public/index.html');
  const indexExists = fs.existsSync(indexPath);
  const publicPath = path.join(__dirname, '../public');
  const assetDirExists = fs.existsSync(path.join(publicPath, 'assets'));
  
  // List actual assets directory if it exists
  let assetFiles: string[] = [];
  if (assetDirExists) {
    try {
      assetFiles = fs.readdirSync(path.join(publicPath, 'assets'));
    } catch (err) {
      console.error('Error reading assets directory:', err);
    }
  }
  
  const diagnosticInfo = {
    message: 'Test endpoint for frontend diagnosis',
    indexExists,
    assetDirExists,
    assetFiles,
    requestPath: req.path,
    publicPath,
    possible_issues: [
      indexExists ? null : 'index.html file is missing',
      assetDirExists ? null : 'assets directory is missing',
      assetFiles.length === 0 && assetDirExists ? 'assets directory is empty' : null
    ].filter(issue => issue !== null)
  };
  
  res.json(diagnosticInfo);
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
  if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/debug' || req.path === '/test') {
    return next();
  }
  
  // Special case: static test page for checking the server
  if (req.path === '/static-test') {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Static Test Page</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a73e8; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
          .success { color: green; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>GCP Release Notes Dashboard - Static Test Page</h1>
        <div class="card">
          <h2>Server Status</h2>
          <p class="success">✅ Server is running properly</p>
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p>Port: ${config.server.port}</p>
        </div>
        <div class="card">
          <h2>Request Information</h2>
          <p>Path: ${req.path}</p>
          <p>Protocol: ${req.protocol}</p>
          <p>Host: ${req.headers.host}</p>
        </div>
        <div class="card">
          <h2>Available Test Endpoints</h2>
          <ul>
            <li><a href="/health">/health</a> - Health check endpoint</li>
            <li><a href="/debug">/debug</a> - Debug endpoint with detailed information</li>
            <li><a href="/test">/test</a> - Test endpoint for frontend diagnosis</li>
            <li><a href="/">/</a> - Main application (requires frontend assets)</li>
          </ul>
        </div>
      </body>
      </html>
    `;
    return res.send(html);
  }
  
  // Log the request that's being handled by the catch-all route
  console.log('Serving frontend for path:', req.path);
  
  const indexPath = path.join(__dirname, '../public/index.html');
  
  // Check if the index.html file exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('ERROR: Frontend index.html not found at', indexPath);
    res.redirect('/static-test'); // Redirect to static test page instead of showing an error
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