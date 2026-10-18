const express = require('express');
const cors = require('cors');
const path = require('path');

const { resolveUser } = require('./middleware/auth');
const { idempotencyMiddleware } = require('./middleware/idempotency');
const { errorHandler } = require('./middleware/errorHandler');

const workItemsRouter = require('./routes/workItems');
const teamsRouter = require('./routes/teams');
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const outboxRouter = require('./routes/outbox');
const simulationRouter = require('./routes/simulation');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// Authentication & Identity Context Middleware
app.use(resolveUser);

// Idempotency Middleware for mutating HTTP requests
app.use(idempotencyMiddleware);

// API Endpoints
app.use('/api/work-items', workItemsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/users', usersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/outbox', outboxRouter);
app.use('/api/simulation', simulationRouter);

// Fallback to index.html for SPA routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  next();
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
