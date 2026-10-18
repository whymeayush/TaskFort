const app = require('./app');
const config = require('./config');
const { getDatabase, closeDatabase } = require('./db/database');
const { seedDatabase } = require('./db/seed');
const outboxService = require('./services/outboxService');

const db = getDatabase();

// Seed if users table is empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  console.log('[Server] Seeding database with initial operational data...');
  seedDatabase(db);
}

// Start background outbox worker
console.log('[Server] Starting asynchronous outbox worker...');
outboxService.startWorker(db);

const server = app.listen(config.PORT, () => {
  console.log(`=======================================================`);
  console.log(`  NEWTONITE OPERATIONS PLATFORM RUNNING`);
  console.log(`  Local URL: http://localhost:${config.PORT}`);
  console.log(`  API Base:  http://localhost:${config.PORT}/api`);
  console.log(`  SSE Event: http://localhost:${config.PORT}/api/events`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  outboxService.stopWorker();
  server.close(() => {
    closeDatabase();
    console.log('[Server] Clean shutdown complete.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
