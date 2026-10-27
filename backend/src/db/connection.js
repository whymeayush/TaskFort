import mongoose from 'mongoose';
import { config } from '../config/index.js';

let replSetInstance = null;

// Global caching for serverless environments (e.g. Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB(customUri = null) {
  if (cached.conn) {
    return cached.conn;
  }

  let uri = customUri || config.MONGODB_URI || process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.VERCEL) {
      throw new Error('[Database] Running on Vercel requires MONGODB_URI environment variable (e.g. MongoDB Atlas cluster).');
    }

    console.log('[Database] No external MONGODB_URI provided. Initializing managed MongoDB Replica Set...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    replSetInstance = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: 'wiredTiger'
      }
    });
    uri = replSetInstance.getUri();
  }

  if (!cached.promise) {
    console.log('[Database] Connecting to MongoDB...');
    cached.promise = mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
      dbName: process.env.MONGODB_DB_NAME || 'taskfort'
    }).then((m) => {
      console.log('[Database] MongoDB connection established successfully. Transactions supported.');
      return m;
    }).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cached.conn = null;
  cached.promise = null;
  if (replSetInstance) {
    await replSetInstance.stop();
    replSetInstance = null;
  }
}
