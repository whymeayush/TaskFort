import mongoose from 'mongoose';

const workItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  type: {
    type: String,
    enum: [
      'CUSTOMER_ISSUE',
      'ENGINEERING_PROBLEM',
      'PAYMENT_INVESTIGATION',
      'PRODUCTION_INCIDENT',
      'COMPLIANCE_REQUEST',
      'OPERATIONAL_APPROVAL'
    ],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Blocked', 'In Review', 'Resolved', 'Closed'],
    default: 'Open',
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  reasonForExistence: {
    type: String,
    required: [true, 'Why this item exists is mandatory'],
    trim: true
  },
  businessImpact: {
    type: String,
    required: [true, 'Business/operational impact is mandatory'],
    trim: true
  },
  nextActionRequired: {
    type: String,
    trim: true,
    default: 'Triage and assign responsible owner'
  },
  dueDate: {
    type: Date,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  pendingApprovalRole: {
    type: String,
    enum: ['TEAM_ADMIN', 'SYSTEM_ADMIN', 'COMPLIANCE_LEAD', null],
    default: null
  },
  resolutionSummary: {
    type: String,
    trim: true
  },
  version: {
    type: Number,
    default: 1,
    required: true,
    index: true
  },
  archivedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for optimal performance at scale
workItemSchema.index({ teamId: 1, status: 1 });
workItemSchema.index({ teamId: 1, priority: 1 });
workItemSchema.index({ assigneeId: 1, status: 1 });
workItemSchema.index({ status: 1, priority: 1 });
workItemSchema.index({ createdAt: -1 });
workItemSchema.index({ updatedAt: -1 });
workItemSchema.index({ title: 'text', description: 'text', reasonForExistence: 'text' });

export const WorkItem = mongoose.model('WorkItem', workItemSchema);
