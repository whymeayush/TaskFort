import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';

let replSetInstance = null;

export async function connectDB(customUri = null) {
  let uri = customUri || config.MONGODB_URI;

  if (!uri) {
    console.log('[Database] No external MONGODB_URI provided. Initializing managed MongoDB Replica Set...');
    replSetInstance = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: 'wiredTiger'
      }
    });
    uri = replSetInstance.getUri();
  }

  console.log('[Database] Connecting to MongoDB Replica Set...');
  await mongoose.connect(uri, {
    autoIndex: true
  });

  console.log('[Database] MongoDB connection established successfully. Transactions supported.');
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (replSetInstance) {
    await replSetInstance.stop();
    replSetInstance = null;
  }
}
