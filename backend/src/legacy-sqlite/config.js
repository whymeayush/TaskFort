const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'newtonite_ops.db'),
  IS_TEST: process.env.NODE_ENV === 'test',
  OUTBOX_POLL_INTERVAL_MS: 1500, // Background worker polling interval
  MAX_OUTBOX_RETRIES: 3,
  DEFAULT_PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 100
};
