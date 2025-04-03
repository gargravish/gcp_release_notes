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
app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
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

// Start server
const port = config.server.port;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} in ${config.server.environment} mode`);
}); 