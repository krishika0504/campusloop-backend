import app from './app.js';
import { ENV } from './config/env.js';
import prisma from './config/db.js';

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL database (campusloop_db)');

    app.listen(ENV.PORT, () => {
      console.log(`CampusLoop REST API server running on port ${ENV.PORT}`);
      console.log(`Health endpoint: http://localhost:${ENV.PORT}/health`);
      console.log(`API Base URL: http://localhost:${ENV.PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
