import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
    ease: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    dueAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const studyDeckSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: 'chat_notes',
    },
    cards: [cardSchema],
  },
  {
    timestamps: true,
  }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: true }
);

const studyQuizSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    questions: [quizQuestionSchema],
  },
  {
    timestamps: true,
  }
);

export const StudyDeck = mongoose.model('StudyDeck', studyDeckSchema);
export const StudyQuiz = mongoose.model('StudyQuiz', studyQuizSchema);
