import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  workItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkItem',
    required: true,
    index: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approverRole: {
    type: String,
    enum: ['TEAM_ADMIN', 'SYSTEM_ADMIN', 'COMPLIANCE_LEAD'],
    default: 'TEAM_ADMIN',
    required: true
  },
  decidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    required: true,
    index: true
  },
  decisionNote: {
    type: String,
    trim: true,
    default: null
  },
  decidedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

approvalSchema.index({ workItemId: 1, status: 1 });

export const Approval = mongoose.model('Approval', approvalSchema);
