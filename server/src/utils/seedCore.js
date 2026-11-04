import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import ConversationUserState from '../models/conversationUserState.model.js';
import Contact from '../models/contact.model.js';
import Block from '../models/block.model.js';
import Report from '../models/report.model.js';
import Call from '../models/call.model.js';
import Task from '../models/task.model.js';
import Deadline from '../models/deadline.model.js';
import Decision from '../models/decision.model.js';
import Meeting from '../models/meeting.model.js';
import Reminder from '../models/reminder.model.js';
import Transcript from '../models/transcript.model.js';
import Translation from '../models/translation.model.js';
import DocAnalysis from '../models/docAnalysis.model.js';
import { StudyDeck, StudyQuiz } from '../models/study.model.js';
import { StickerPack, Sticker, UserStickerState } from '../models/sticker.model.js';
import AiThread from '../models/aiThread.model.js';
import AiSummary from '../models/aiSummary.model.js';
import AiActivity from '../models/aiActivity.model.js';
import AiConsent from '../models/aiConsent.model.js';
import AnalyticsDaily from '../models/analyticsDaily.model.js';
import { ensureOfficialPacks } from '../controllers/sticker.controller.js';

/**
 * Completely clears all collections and initializes only official assets (e.g. sticker packs)
 * Zero demo users, zero dummy messages, zero dummy conversations.
 */
export async function resetAndSeedDatabase() {
  console.log('🧹 [Database Wipe] Purging all collections across the database...');

  await Promise.all([
    User.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    ConversationUserState.deleteMany({}),
    Contact.deleteMany({}),
    Block.deleteMany({}),
    Report.deleteMany({}),
    Call.deleteMany({}),
    Task.deleteMany({}),
    Deadline.deleteMany({}),
    Decision.deleteMany({}),
    Meeting.deleteMany({}),
    Reminder.deleteMany({}),
    Transcript.deleteMany({}),
    Translation.deleteMany({}),
    DocAnalysis.deleteMany({}),
    StudyDeck.deleteMany({}),
    StudyQuiz.deleteMany({}),
    StickerPack.deleteMany({}),
    Sticker.deleteMany({}),
    UserStickerState.deleteMany({}),
    AiThread.deleteMany({}),
    AiSummary.deleteMany({}),
    AiActivity.deleteMany({}),
    AiConsent.deleteMany({}),
    AnalyticsDaily.deleteMany({}),
  ]);

  console.log('✨ [Database Wipe] All user and chat data completely wiped.');

  // Initialize official sticker packs with working high-res assets
  console.log('🎨 [Stickers] Initializing official sticker packs with CDN assets...');
  await ensureOfficialPacks();
  console.log('✅ [Stickers] Official sticker packs initialized.');

  return {
    cleared: true,
    usersCount: 0,
    conversationsCount: 0,
    messagesCount: 0,
    message: 'Database completely empty and clean. Official sticker packs ready.',
  };
}
