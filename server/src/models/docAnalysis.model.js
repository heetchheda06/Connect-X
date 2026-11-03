import mongoose from 'mongoose';

const docAnalysisSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      unique: true,
      index: true,
    },
    textHash: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    entities: [
      {
        type: { type: String, default: 'General' },
        name: { type: String, required: true },
      },
    ],
    tables: [
      {
        headers: [String],
        rows: [[String]],
      },
    ],
    pagesAnalyzed: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'ready',
    },
  },
  {
    timestamps: true,
  }
);

export const DocAnalysis = mongoose.model('DocAnalysis', docAnalysisSchema);
export default DocAnalysis;
