import mongoose from 'mongoose';

const idempotencyKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestPath: {
    type: String,
    required: true
  },
  requestMethod: {
    type: String,
    required: true
  },
  requestHash: {
    type: String
  },
  responseStatus: {
    type: Number,
    required: true
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically pruned after 24 hours
  }
});

idempotencyKeySchema.index({ key: 1, userId: 1 });

export const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);
