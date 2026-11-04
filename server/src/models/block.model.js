import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blocked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One block record per blocker + blocked pair
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const Block = mongoose.model('Block', blockSchema);
export default Block;

