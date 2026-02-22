import { createApp } from './app';
import { env, validateEnv, testDatabaseConnection, disconnectDatabase } from './config';

async function main(): Promise<void> {
  // Validate environment variables
  validateEnv();

  // Test database connection (non-fatal — app still serves frontend)
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.warn('Warning: Database not connected. Subscription features will be unavailable.');
  }

  // Create Express app
  const app = createApp();

  // Start server
  const server = app.listen(env.PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   SlayJobs Backend API                                 ║
║                                                        ║
║   Server running on port ${env.PORT}                        ║
║   Environment: ${env.NODE_ENV.padEnd(20)}               ║
║   Frontend URL: ${env.FRONTEND_URL.padEnd(32)}         ║
║                                                        ║
║   Endpoints:                                           ║
║   - Health: http://localhost:${env.PORT}/api/v1/health      ║
║   - API:    http://localhost:${env.PORT}/api/v1             ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      console.log('HTTP server closed');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
