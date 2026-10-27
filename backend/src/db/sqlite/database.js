const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let dbInstance = null;

function getDatabase(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || config.DB_PATH;

  // Ensure data directory exists
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // WAL mode for concurrency and durability
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  // Run schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Helper method for immediate transactions
  db.transaction = function (fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn(db);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (err) {
      // ignore on close
    }
    dbInstance = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase
};
