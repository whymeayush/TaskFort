import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  workItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkItem',
    required: true,
    index: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    enum: [
      'CREATED',
      'ASSIGNED',
      'REASSIGNED',
      'UNASSIGNED',
      'STATUS_CHANGE',
      'PRIORITY_CHANGE',
      'FIELD_UPDATE',
      'COMMENT_ADDED',
      'APPROVAL_REQUESTED',
      'APPROVAL_GRANTED',
      'APPROVAL_REJECTED'
    ],
    required: true
  },
  field: {
    type: String,
    default: null
  },
  prevValue: {
    type: String,
    default: null
  },
  newValue: {
    type: String,
    default: null
  },
  comment: {
    type: String,
    default: null
  },
  correlationId: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Composite index for timeline pagination & chronological ordering
activityLogSchema.index({ workItemId: 1, timestamp: 1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
