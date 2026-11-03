import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      unique: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      default: '',
    },
    language: {
      type: String,
      default: 'en',
    },
    summary: {
      type: String,
      default: '',
    },
    actionItems: {
      type: [String],
      default: [],
    },
    durationSec: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Transcript = mongoose.model('Transcript', transcriptSchema);
export default Transcript;
