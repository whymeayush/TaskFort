import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  workItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkItem',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  body: {
    type: String,
    required: [true, 'Comment body cannot be empty'],
    trim: true
  },
  editMetadata: {
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null }
  }
}, {
  timestamps: true
});

commentSchema.index({ workItemId: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
