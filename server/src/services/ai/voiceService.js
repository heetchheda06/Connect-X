import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import Message from '../../models/message.model.js';
import Conversation from '../../models/conversation.model.js';
import Transcript from '../../models/transcript.model.js';
import User from '../../models/user.model.js';
import { speechService } from './speechService.js';
import { llmService } from './llmService.js';
import { VOICE_SUMMARY_PROMPT, wrapChatData } from './prompts.js';
import { getGridFSBucket } from '../storage.service.js';
import { env } from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.join(__dirname, '../../../uploads');

const voiceSummarySchema = z.object({
  summary: z.string().default(''),
  actionItems: z.array(z.string()).default([]),
});

export class VoiceService {
  /**
   * Helper to ensure audio file exists on disk (fetches from GridFS if needed)
   */
  async ensureAudioOnDisk(filename) {
    const localPath = path.join(uploadsDirectory, filename);
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    // Try to fetch from GridFS
    const bucket = getGridFSBucket();
    if (!bucket) {
      throw new Error('Audio file not found on disk or database');
    }

    const files = await bucket.find({ filename }).toArray();
    if (!files || files.length === 0) {
      throw new Error(`Audio file "${filename}" not found in storage`);
    }

    const writeStream = fs.createWriteStream(localPath);
    const downloadStream = bucket.openDownloadStreamByName(filename);

    await new Promise((resolve, reject) => {
      downloadStream.pipe(writeStream).on('finish', resolve).on('error', reject);
    });

    return localPath;
  }

  /**
   * Transcribe a voice note and generate an AI summary if >60s
   */
  async transcribeMessage({ messageId, userId, socketIo = null }) {
    if (!messageId) {
      const err = new Error('messageId is required');
      err.status = 400;
      throw err;
    }

    // 1. Verify user AI settings
    const user = await User.findById(userId).select('aiSettings');
    if (!user || !user.aiSettings?.enabled) {
      const err = new Error('AI features are disabled in your settings. Please enable them to transcribe.');
      err.status = 403;
      throw err;
    }

    // 2. Fetch message
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error('Message not found');
      err.status = 404;
      throw err;
    }

    if (message.isDeletedForEveryone) {
      const err = new Error('Cannot transcribe deleted message');
      err.status = 400;
      throw err;
    }

    // 3. Verify conversation membership
    const conversation = await Conversation.findById(message.conversation).select('members');
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.status = 404;
      throw err;
    }

    const isMember = conversation.members?.some(
      (m) => m.user?.toString() === userId.toString()
    );
    if (!isMember) {
      const err = new Error('You are not authorized to access this conversation');
      err.status = 403;
      throw err;
    }

    // 4. Check cache in Transcript model
    const existing = await Transcript.findOne({ message: message._id });
    if (existing) {
      return {
        text: existing.text,
        language: existing.language,
        summary: existing.summary,
        actionItems: existing.actionItems,
        durationSec: existing.durationSec,
        cached: true,
      };
    }

    // 5. Ensure audio file exists
    const audioUrl = message.attachment?.url;
    if (!audioUrl) {
      const err = new Error('Message does not contain an audio attachment');
      err.status = 400;
      throw err;
    }

    const filename = path.basename(audioUrl);
    const localAudioPath = await this.ensureAudioOnDisk(filename);

    // 6. Transcribe using speechService
    const sttResult = await speechService.transcribe(
      localAudioPath,
      user.aiSettings?.preferredLanguage || ''
    );

    const transcribedText = sttResult.text?.trim() || "Couldn't make out speech.";
    const detectedLang = sttResult.language || 'en';
    const duration = message.attachment?.durationSec || sttResult.durationSec || 0;

    let summary = '';
    let actionItems = [];

    // 7. If duration >= 60 seconds or text > 50 words, generate summary and action items
    const wordCount = transcribedText.split(/\s+/).length;
    if ((duration >= 60 || wordCount > 50) && transcribedText !== "Couldn't make out speech.") {
      try {
        const wrappedTranscript = wrapChatData(transcribedText, 'voice_transcript');
        const summaryPrompt = `Analyze the voice note transcript in <chat_data>.
Generate a concise 2-3 line summary and extract any action items, commitments, or dates mentioned.`;

        const summaryRes = await llmService.generateStructured({
          systemInstruction: VOICE_SUMMARY_PROMPT,
          prompt: `${wrappedTranscript}\n\n${summaryPrompt}`,
          schema: voiceSummarySchema,
          modelTier: env.aiModelFast || env.aiModel,
        });

        summary = summaryRes?.summary?.trim() || '';
        actionItems = summaryRes?.actionItems || [];
      } catch (err) {
        console.warn('[VoiceService] Summary generation fallback:', err.message);
      }
    }

    // 8. Cache transcript in MongoDB
    const savedTranscript = await Transcript.create({
      message: message._id,
      text: transcribedText,
      language: detectedLang,
      summary,
      actionItems,
      durationSec: duration,
    });

    const result = {
      text: savedTranscript.text,
      language: savedTranscript.language,
      summary: savedTranscript.summary,
      actionItems: savedTranscript.actionItems,
      durationSec: savedTranscript.durationSec,
      cached: false,
    };

    // 9. Emit socket event transcript:ready to conversation room
    if (socketIo) {
      socketIo.to(`conversation:${message.conversation.toString()}`).emit('transcript:ready', {
        messageId: message._id.toString(),
        transcript: result,
      });
    }

    return result;
  }
}

export const voiceService = new VoiceService();
export default voiceService;
