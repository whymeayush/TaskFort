import mongoose from 'mongoose';

const teamMembershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  roleInTeam: {
    type: String,
    enum: ['TEAM_ADMIN', 'TEAM_MEMBER', 'READ_ONLY_VIEWER'],
    default: 'TEAM_MEMBER',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Enforce single active membership per user and team
teamMembershipSchema.index({ userId: 1, teamId: 1 }, { unique: true });

export const TeamMembership = mongoose.model('TeamMembership', teamMembershipSchema);
