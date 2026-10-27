import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  systemRole: {
    type: String,
    enum: ['SYSTEM_ADMIN', 'TEAM_ADMIN', 'TEAM_MEMBER', 'READ_ONLY_VIEWER'],
    default: 'TEAM_MEMBER'
  },
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  avatarColor: {
    type: String,
    default: '#3b82f6'
  }
}, {
  timestamps: true
});

userSchema.methods.comparePassword = async function (plaintextPassword) {
  return bcrypt.compare(plaintextPassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
