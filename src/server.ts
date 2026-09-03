import app from './app.js';
import { ENV } from './config/env.js';
import prisma from './config/db.js';
import { dbState } from './config/dbState.js';

async function connectWithRetry(retries = 10, delayMs = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$connect();
      dbState.setConnected(true);
      console.log('Successfully connected to PostgreSQL database');
      return;
    } catch (error: any) {
      console.warn(`Database connection attempt ${i}/${retries} failed:`, error.message || error);
      if (i < retries) {
        console.log(`Retrying database connection in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('All database connection attempts failed. Check DATABASE_URL configuration.');
      }
    }
  }
}

async function startServer() {
  const host = '0.0.0.0';
  const port = ENV.PORT;

  // 1. Immediately bind and listen so Cloud Run health check and ingress pass instantly!
  const server = app.listen(port, host, () => {
    console.log(`========================================`);
    console.log(`CampusLoop REST API server running on http://${host}:${port}`);
    console.log(`Root endpoint: http://${host}:${port}/`);
    console.log(`Health endpoint: http://${host}:${port}/health`);
    console.log(`API Base URL: http://${host}:${port}/api`);
    console.log(`Environment: ${ENV.NODE_ENV}`);
    console.log(`========================================`);
  });

  // 2. Connect to database asynchronously without blocking container startup
  connectWithRetry();

  // 3. Graceful shutdown handler for Cloud Run container lifecycle
  const handleShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Closing server gracefully...`);
    server.close(async () => {
      try {
        await prisma.$disconnect();
        console.log('Database client disconnected.');
      } catch (e) {
        console.error('Error disconnecting database:', e);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();
