import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    targetLang: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    translatedText: {
      type: String,
      required: true,
    },
    detectedSourceLang: {
      type: String,
      default: 'en',
      lowercase: true,
      trim: true,
    },
    alreadyInTargetLang: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one translation per message per target language
translationSchema.index({ message: 1, targetLang: 1 }, { unique: true });

export const Translation = mongoose.model('Translation', translationSchema);
export default Translation;
