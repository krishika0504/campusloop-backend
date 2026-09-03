import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { ENV } from './config/env.js';

const app: Express = express();

// Global Middleware
app.use(
  cors({
    origin: ENV.CORS_ORIGIN === '*' ? true : [ENV.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

import { dbState } from './config/dbState.js';

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'CampusLoop REST API',
    status: 'online',
    health: '/health',
    api: '/api',
    docs: 'Circular Resource-Sharing Platform for College Students',
  });
});

// Health check endpoint (for Cloud Run probes & uptime checks)
app.get('/health', (_req: Request, res: Response) => {
  const dbConnected = dbState.isConnected();
  res.json({
    status: 'healthy',
    database: dbConnected ? 'connected' : 'connecting',
    timestamp: new Date().toISOString(),
    service: 'campusloop-backend',
    version: '1.0.0',
    environment: ENV.NODE_ENV,
  });
});

// Mount master REST API router
app.use('/api', routes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(ENV.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

export default app;
