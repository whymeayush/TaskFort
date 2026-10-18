import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['ASSIGNMENT', 'STATUS_CHANGE', 'APPROVAL_REQUEST', 'APPROVAL_DECISION', 'COMMENT'],
    required: true
  },
  workItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkItem',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  readAt: {
    type: Date,
    default: null
  },
  deduplicationKey: {
    type: String,
    sparse: true,
    unique: true
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
