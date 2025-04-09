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
  // Find all static assets in the public directory
  const publicDir = path.join(__dirname, '../public');
  let frontendFiles = [];
  let missingCriticalFiles = [];
  
  try {
    const listFiles = (dir) => {
      const files = require('fs').readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = require('fs').statSync(filePath);
        if (stats.isDirectory()) {
          listFiles(filePath); // Recursively list files in subdirectories
        } else {
          frontendFiles.push(filePath.replace(publicDir, ''));
          
          // Check if any critical frontend files are missing
          if (file === 'index.html' || file.endsWith('.js') || file.endsWith('.css')) {
            const fileContent = require('fs').readFileSync(filePath, 'utf8');
            if (fileContent.length < 10) { // If file seems empty or corrupted
              missingCriticalFiles.push(file + ' (empty or corrupted)');
            }
          }
        }
      });
    };
    
    if (require('fs').existsSync(publicDir)) {
      listFiles(publicDir);
    }
  } catch (err) {
    console.error('Error reading frontend files:', err);
  }
  
  // Check for common frontend issues
  const indexPath = path.join(__dirname, '../public/index.html');
  let indexContent = '';
  let indexIssues = [];
  
  if (require('fs').existsSync(indexPath)) {
    indexContent = require('fs').readFileSync(indexPath, 'utf8').slice(0, 500) + '...'; // Get first 500 chars
    
    // Check for common frontend issues in index.html
    if (!indexContent.includes('<!DOCTYPE html>')) {
      indexIssues.push('Missing DOCTYPE');
    }
    if (!indexContent.includes('<div id="root"></div>') && !indexContent.includes('<div id="app"></div>')) {
      indexIssues.push('Missing root/app div');
    }
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
    publicPath: publicDir,
    publicExists: require('fs').existsSync(publicDir),
    indexExists: require('fs').existsSync(indexPath),
    frontendFileCount: frontendFiles.length,
    frontendAssets: frontendFiles.filter(f => f.endsWith('.js') || f.endsWith('.css')),
    missingCriticalFiles,
    indexContent,
    indexIssues,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    }
  });
});

// Add a special debug endpoint to see frontend status
app.get('/debug-frontend', (req, res) => {
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>Frontend Debug</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .status { margin: 20px 0; padding: 10px; border-radius: 5px; }
    .success { background-color: #dff0d8; border: 1px solid #d6e9c6; }
    .error { background-color: #f2dede; border: 1px solid #ebccd1; }
    pre { background: #f5f5f5; padding: 10px; overflow: auto; }
  </style>
</head>
<body>
  <h1>Frontend Debug Information</h1>`;

  // Check for index.html
  const publicDir = path.join(__dirname, '../public');
  const indexPath = path.join(publicDir, 'index.html');
  
  if (require('fs').existsSync(indexPath)) {
    html += `<div class="status success">index.html exists ✅</div>`;
    
    try {
      const indexContent = require('fs').readFileSync(indexPath, 'utf8');
      const firstFew = indexContent.slice(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += `<h3>First 200 characters of index.html:</h3><pre>${firstFew}...</pre>`;
    } catch (err) {
      html += `<div class="status error">Error reading index.html: ${err.message}</div>`;
    }
  } else {
    html += `<div class="status error">index.html does NOT exist ❌</div>`;
  }
  
  // List JS and CSS files
  html += `<h3>JavaScript and CSS files:</h3>`;
  try {
    const findAssets = (dir, assets = []) => {
      const files = require('fs').readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = require('fs').statSync(filePath);
        if (stats.isDirectory()) {
          findAssets(filePath, assets);
        } else if (file.endsWith('.js') || file.endsWith('.css')) {
          assets.push({
            path: filePath.replace(publicDir, ''),
            size: stats.size
          });
        }
      });
      return assets;
    };
    
    const assets = findAssets(publicDir);
    
    if (assets.length > 0) {
      html += `<div class="status success">Found ${assets.length} JavaScript/CSS files</div>`;
      html += `<ul>`;
      assets.forEach(asset => {
        html += `<li>${asset.path} (${Math.round(asset.size / 1024)}KB)</li>`;
      });
      html += `</ul>`;
    } else {
      html += `<div class="status error">No JavaScript or CSS files found!</div>`;
    }
  } catch (err) {
    html += `<div class="status error">Error listing assets: ${err.message}</div>`;
  }
  
  // Add a test script to check if JS execution works
  html += `
  <h3>JavaScript Execution Test:</h3>
  <div id="js-test">Testing JavaScript execution...</div>
  <script>
    document.getElementById('js-test').innerHTML = 'JavaScript is working properly! ✅';
  </script>
  
  <h3>Request Information:</h3>
  <pre>
  URL: ${req.url}
  Protocol: ${req.protocol}
  Host: ${req.headers.host}
  User-Agent: ${req.headers['user-agent']}
  X-Forwarded-Proto: ${req.headers['x-forwarded-proto'] || 'not set'}
  </pre>
  </body>
  </html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Create a simple test HTML page to check if static HTML files are working
app.get('/test.html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Static HTML Test</title>
    </head>
    <body>
      <h1>Static HTML Test Page</h1>
      <p>If you can see this, the server is correctly serving static HTML files.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Protocol: ${req.protocol}</p>
      <p>Host: ${req.headers.host}</p>
    </body>
    </html>
  `);
});

// Add a fallback HTML page for when things aren't working
app.get('/fallback.html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fallback Page</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { margin-top: 40px; }
        h1 { color: #333; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
        .info { background: #e9f7fe; border-left: 4px solid #2196F3; padding: 16px; margin: 16px 0; }
        .steps { background: #fff8e1; border-left: 4px solid #ffb300; padding: 16px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>GCP Release Notes Dashboard - Fallback</h1>
        <div class="info">
          <h2>Diagnostic Information</h2>
          <p>This is a fallback page to help diagnose issues with the application.</p>
          <pre>
Time: ${new Date().toISOString()}
URL: ${req.url}
Protocol: ${req.protocol}
Host: ${req.headers.host}
Path: ${req.path}
User Agent: ${req.headers['user-agent']}
IP: ${req.ip}
X-Forwarded-Proto: ${req.headers['x-forwarded-proto'] || 'not set'}
          </pre>
        </div>
        
        <div class="steps">
          <h2>Troubleshooting Steps</h2>
          <ol>
            <li>Try accessing the <a href="/debug">debug endpoint</a> for detailed diagnostics</li>
            <li>Try the <a href="/debug-frontend">frontend debug page</a> to check frontend assets</li>
            <li>Clear your browser cache completely and try again</li>
            <li>Try accessing the app in a different browser</li>
            <li>Try accessing the <a href="/test.html">static test page</a> to verify basic HTML serving</li>
          </ol>
        </div>
        
        <p>
          If you're still experiencing issues, please check the server logs for more detailed information.
        </p>
      </div>
    </body>
    </html>
  `);
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
  if (req.path.startsWith('/api/') || 
      req.path === '/health' || 
      req.path === '/debug' || 
      req.path === '/debug-frontend' ||
      req.path === '/test.html' ||
      req.path === '/fallback.html') {
    return next();
  }
  
  // Log the request that's being handled by the catch-all route
  console.log('Serving frontend for path:', req.path);
  
  const indexPath = path.join(__dirname, '../public/index.html');
  
  // Check if the index.html file exists
  if (require('fs').existsSync(indexPath)) {
    console.log('Sending index.html for path:', req.path);
    
    try {
      // First check if the file is readable and not empty
      const indexContent = require('fs').readFileSync(indexPath, 'utf8');
      if (indexContent.length < 100) {
        console.error('ERROR: index.html file is too small, may be corrupted:', indexContent);
        return res.redirect('/fallback.html');
      }
      
      // Add proper headers for the HTML content
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.redirect('/fallback.html');
        }
      });
    } catch (err) {
      console.error('Error reading index.html:', err);
      res.redirect('/fallback.html');
    }
  } else {
    console.error('ERROR: Frontend index.html not found at', indexPath);
    res.redirect('/fallback.html');
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