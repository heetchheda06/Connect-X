import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contactUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: [60, 'Nickname cannot exceed 60 characters'],
      default: '',
    },
    favorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One contact record per owner + contactUser
contactSchema.index({ owner: 1, contactUser: 1 }, { unique: true });
contactSchema.index({ owner: 1, favorite: -1, addedAt: -1 });

export const Contact = mongoose.model('Contact', contactSchema);
export default Contact;

