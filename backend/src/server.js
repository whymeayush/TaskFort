import app from './app.js';
import { config } from './config/index.js';
import { connectDB, disconnectDB } from './db/connection.js';
import { seedDatabase } from './seeds/seed.js';
import { User } from './models/User.js';

async function startServer() {
  try {
    console.log('[Server] Connecting to database...');
    await connectDB();

    // Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database is empty. Seeding initial operational data...');
      await seedDatabase();
    } else {
      console.log(`[Server] Found ${userCount} existing users in database.`);
    }

    const server = app.listen(config.PORT, () => {
      console.log('=======================================================');
      console.log('  NEWTONITE OPERATIONS HUB — BACKEND SERVICES');
      console.log(`  Local URL:   http://localhost:${config.PORT}`);
      console.log(`  API Health:  http://localhost:${config.PORT}/api/health`);
      console.log(`  Environment: ${config.NODE_ENV}`);
      console.log('=======================================================');
    });

    // Graceful shutdown handling
    async function gracefulShutdown(signal) {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Clean shutdown complete.');
        process.exit(0);
      });
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { startServer };
