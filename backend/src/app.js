import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { idempotencyMiddleware } from './middleware/idempotency.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRouter from './routes/auth.js';
import teamsRouter from './routes/teams.js';
import workItemsRouter from './routes/workItems.js';
import approvalsRouter from './routes/approvals.js';
import notificationsRouter from './routes/notifications.js';
import dashboardRouter from './routes/dashboard.js';
import simulationRouter from './routes/simulation.js';
import eventsRouter from './routes/events.js';
import outboxRouter from './routes/outbox.js';

const app = express();

// Security & middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting on sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many authentication attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);

// Idempotency Middleware for all mutating requests
app.use(idempotencyMiddleware);

// API Route Registry
app.use('/api/auth', authRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/work-items', workItemsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/simulation', simulationRouter);
app.use('/api/events', eventsRouter);
app.use('/api/outbox', outboxRouter);

// Health check
app.get('/api/health', (req, res) => {
  const dbStates = ['DISCONNECTED', 'CONNECTED', 'CONNECTING', 'DISCONNECTING'];
  const dbState = dbStates[mongoose.connection.readyState] || 'UNKNOWN';
  const isHealthy = mongoose.connection.readyState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    database: dbState,
    service: 'Newtonite Operations Hub Backend (MERN)',
    timestamp: new Date().toISOString()
  });
});

// Serve compiled React frontend if present
const clientDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Centralized error handler
app.use(errorHandler);

export default app;
