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

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path} (${req.get('x-forwarded-proto') || req.protocol})`);
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
      PORT: process.env.PORT,
      CORS_ORIGINS: config.cors.allowedOrigins,
      PUBLIC_PATH_RESOLVED: path.resolve(publicPath)
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

// Also serve assets directly to handle direct asset requests
app.use('/assets', express.static(path.join(__dirname, '../public/assets'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
}));

// New endpoint to verify static file serving directly
app.get('/static-file-test/:filename', (req, res) => {
  const filename = req.params.filename;
  const publicPath = path.join(__dirname, '../public');
  const fullPath = path.join(publicPath, filename);
  
  if (fs.existsSync(fullPath)) {
    res.json({
      fileExists: true,
      fileName: filename,
      fullPath: fullPath,
      fileSize: fs.statSync(fullPath).size,
      isFile: fs.statSync(fullPath).isFile()
    });
  } else {
    res.status(404).json({
      fileExists: false,
      fileName: filename,
      fullPath: fullPath,
      error: 'File not found'
    });
  }
});

// Add specific endpoint to check all assets and troubleshoot loading problems
app.get('/check-assets', (req, res) => {
  const publicPath = path.join(__dirname, '../public');
  
  interface AssetFile {
    name: string;
    path?: string;
    size?: number;
    isFile?: boolean;
    url?: string;
    error?: string;
  }
  
  interface Reference {
    type: string;
    url: string;
    exists: boolean;
  }
  
  interface AssetsCheckResult {
    root: {
      exists: boolean;
      isDirectory: boolean;
    };
    assets: {
      directory: {
        path: string;
        exists: boolean;
        isDirectory: boolean;
      };
      files: AssetFile[];
      error?: string;
    };
    index: {
      path: string;
      exists: boolean;
      isFile: boolean;
      size: number;
      content: string | null;
      references: Reference[];
      error?: string;
    };
    httpAccess: {
      indexUrl: string;
      assetsBaseUrl: string;
      staticServing: boolean;
      routes: Array<{
        path: string;
        methods: string[];
      }>;
    };
  }
  
  const results: AssetsCheckResult = {
    root: {
      exists: fs.existsSync(publicPath),
      isDirectory: fs.existsSync(publicPath) ? fs.statSync(publicPath).isDirectory() : false
    },
    assets: {
      directory: {
        path: path.join(publicPath, 'assets'),
        exists: fs.existsSync(path.join(publicPath, 'assets')),
        isDirectory: fs.existsSync(path.join(publicPath, 'assets')) ? 
                    fs.statSync(path.join(publicPath, 'assets')).isDirectory() : false
      },
      files: []
    },
    index: {
      path: path.join(publicPath, 'index.html'),
      exists: fs.existsSync(path.join(publicPath, 'index.html')),
      isFile: fs.existsSync(path.join(publicPath, 'index.html')) ? 
              fs.statSync(path.join(publicPath, 'index.html')).isFile() : false,
      size: fs.existsSync(path.join(publicPath, 'index.html')) ? 
            fs.statSync(path.join(publicPath, 'index.html')).size : 0,
      content: null,
      references: []
    },
    httpAccess: {
      indexUrl: `${req.protocol}://${req.get('host')}/index.html`,
      assetsBaseUrl: `${req.protocol}://${req.get('host')}/assets/`,
      staticServing: express.static.toString().length > 0,
      routes: app._router.stack
        .filter((r: any) => r.route && r.route.path)
        .map((r: any) => ({
          path: r.route.path,
          methods: Object.keys(r.route.methods).filter(m => r.route.methods[m])
        }))
    }
  };

  // Check assets directory content
  if (results.assets.directory.exists) {
    try {
      const assetFiles = fs.readdirSync(path.join(publicPath, 'assets'));
      assetFiles.forEach(file => {
        const filePath = path.join(publicPath, 'assets', file);
        try {
          results.assets.files.push({
            name: file,
            path: filePath,
            size: fs.statSync(filePath).size,
            isFile: fs.statSync(filePath).isFile(),
            url: `${req.protocol}://${req.get('host')}/assets/${file}`
          });
        } catch (err) {
          results.assets.files.push({
            name: file,
            error: (err as Error).message
          });
        }
      });
    } catch (err) {
      results.assets.error = (err as Error).message;
    }
  }

  // Check index.html content for script/css references
  if (results.index.exists) {
    try {
      const content = fs.readFileSync(path.join(publicPath, 'index.html'), 'utf8');
      // Just get the first 500 chars for preview
      results.index.content = content.substring(0, 500) + (content.length > 500 ? '...' : '');
      
      // Find script and link tags
      const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/g;
      const linkRegex = /<link[^>]*href=["']([^"']+)["'][^>]*>/g;
      
      let match;
      while ((match = scriptRegex.exec(content)) !== null) {
        results.index.references.push({
          type: 'script',
          url: match[1],
          exists: fs.existsSync(path.join(publicPath, match[1].replace(/^\//, '')))
        });
      }
      
      while ((match = linkRegex.exec(content)) !== null) {
        results.index.references.push({
          type: 'link',
          url: match[1],
          exists: fs.existsSync(path.join(publicPath, match[1].replace(/^\//, '')))
        });
      }
    } catch (err) {
      results.index.error = (err as Error).message;
    }
  }

  res.json(results);
});

// All remaining requests return the React app, so it can handle routing
app.get('*', (req, res, next) => {
  // Skip API and health check routes
  if (req.path.startsWith('/api/') || 
      req.path === '/health' || 
      req.path === '/debug' || 
      req.path === '/test' ||
      req.path.startsWith('/static-file-test/') ||
      req.path.startsWith('/assets/')) {  // Skip asset paths too
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
          <h2>Direct Asset Access Test</h2>
          <p>Try accessing these assets directly:</p>
          <ul>
            <li><a href="/assets/index-DLnPPNGv.css" target="_blank">/assets/index-DLnPPNGv.css</a></li>
            <li><a href="/assets/index-B_K7oHGR.js" target="_blank">/assets/index-B_K7oHGR.js</a></li>
          </ul>
        </div>
        <div class="card">
          <h2>Available Test Endpoints</h2>
          <ul>
            <li><a href="/health">/health</a> - Health check endpoint</li>
            <li><a href="/debug">/debug</a> - Debug endpoint with detailed information</li>
            <li><a href="/test">/test</a> - Test endpoint for frontend diagnosis</li>
            <li><a href="/check-assets">/check-assets</a> - <strong>NEW!</strong> Advanced asset diagnostics</li>
            <li><a href="/static-file-test/index.html">/static-file-test/index.html</a> - Test specific file accessibility</li>
            <li><a href="/static-file-test/assets/index-DLnPPNGv.css">/static-file-test/assets/index-DLnPPNGv.css</a> - Test CSS asset</li>
            <li><a href="/">/</a> - Main application (requires frontend assets)</li>
          </ul>
        </div>
        <div class="card">
          <h2>Troubleshooting Tips</h2>
          <ol>
            <li>Check if all the diagnostic endpoints work correctly. If they do, the server is running properly.</li>
            <li>Use the <code>/check-assets</code> endpoint to see details about how your assets are being served.</li>
            <li>If assets aren't loading, check if the file paths in the generated HTML match the actual paths on the server.</li>
            <li>Try rebuilding the container with <code>docker build</code> to ensure all assets are properly copied.</li>
            <li>Verify that the <code>/assets</code> directory contains the expected files with <code>/debug</code> endpoint.</li>
          </ol>
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
    console.log(`Sending index.html file from: ${indexPath}`);
    
    // Try reading the file first to debug any potential issues
    try {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      console.log(`Successfully read index.html, size: ${indexContent.length} bytes`);
      
      // For debugging: Log the first 200 characters of index.html
      console.log('index.html preview:', indexContent.substring(0, 200));
      
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html file:', err);
          res.status(500).send('Error serving frontend application');
        }
      });
    } catch (err) {
      console.error('Error reading index.html file:', err);
      res.redirect('/static-test');
    }
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