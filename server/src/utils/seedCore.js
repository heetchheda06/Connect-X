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

export async function resetAndSeedDatabase() {
  console.log('🧹 [Reset & Seed] Clearing all collections across database...');

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

  console.log('✨ [Reset & Seed] All collections emptied successfully.');

  const rawPassword = 'Password123!';

  // 1. Create 6 Demo Users
  console.log('👥 [Reset & Seed] Creating 6 demo accounts...');
  const usersData = [
    {
      name: 'Aman Verma',
      username: 'aman_v',
      email: 'aman@example.com',
      password: rawPassword,
      bio: 'Frontend architect & design system enthusiast 🌊',
      status: 'Crafting calm interfaces with ocean vibes',
      aiSettings: { enabled: true, preferredLanguage: 'en', timezone: 'Asia/Kolkata' },
    },
    {
      name: 'Riya Sen',
      username: 'riya_s',
      email: 'riya@example.com',
      password: rawPassword,
      bio: 'Full-stack developer ⚡ Building high-performance real-time apps 🚀',
      status: 'In the zone 💻',
      aiSettings: { enabled: true, preferredLanguage: 'en', timezone: 'Asia/Kolkata' },
    },
    {
      name: 'Priya Sharma',
      username: 'priya_sharma',
      email: 'priya@example.com',
      password: rawPassword,
      bio: 'Product strategist, UX researcher & coffee lover ☕',
      status: 'Reviewing user journeys',
      aiSettings: { enabled: true, preferredLanguage: 'en', timezone: 'Asia/Kolkata' },
    },
    {
      name: 'Rohan Mehta',
      username: 'rohan_m',
      email: 'rohan@example.com',
      password: rawPassword,
      bio: 'Cloud infrastructure & distributed systems engineer ☁️',
      status: 'Deploying services with zero downtime',
      aiSettings: { enabled: true, preferredLanguage: 'en', timezone: 'Asia/Kolkata' },
    },
    {
      name: 'Ananya Iyer',
      username: 'ananya_i',
      email: 'ananya@example.com',
      password: rawPassword,
      bio: 'Lead product designer 🎨 Living in Figma & CSS ✨',
      status: 'Polishing micro-interactions',
      aiSettings: { enabled: true, preferredLanguage: 'en', timezone: 'Asia/Kolkata' },
    },
    {
      name: 'Kabir Joshi',
      username: 'kabir_j',
      email: 'kabir@example.com',
      password: rawPassword,
      bio: 'Security researcher & open-source contributor 🛡️',
      status: 'Auditing protocols',
      aiSettings: { enabled: true, preferredLanguage: 'en', timezone: 'Asia/Kolkata' },
    },
  ];

  const createdUsers = await User.create(usersData);
  const [aman, riya, priya, rohan, ananya, kabir] = createdUsers;
  console.log(`✅ [Reset & Seed] Created ${createdUsers.length} users.`);

  // 2. Direct Conversation: Aman & Riya
  console.log('💬 [Reset & Seed] Creating direct chat: Aman & Riya...');
  const directKeyAmanRiya = [aman._id.toString(), riya._id.toString()].sort().join('_');
  const directAmanRiya = await Conversation.create({
    type: 'direct',
    directKey: directKeyAmanRiya,
    createdBy: aman._id,
    members: [
      { user: aman._id, role: 'member' },
      { user: riya._id, role: 'member' },
    ],
  });

  const msg1 = await Message.create({
    conversation: directAmanRiya._id,
    sender: aman._id,
    type: 'text',
    content: 'Hey Riya! Have you checked out the new ConnectX ocean design tokens?',
    readBy: [{ user: riya._id, readAt: new Date(Date.now() - 3600000) }],
    deliveredTo: [riya._id],
    createdAt: new Date(Date.now() - 3600000),
  });

  const msg2 = await Message.create({
    conversation: directAmanRiya._id,
    sender: riya._id,
    type: 'text',
    content: 'Yes! The teal-cyan gradient with the soft aqua background looks stunning. Really fresh and modern.',
    replyTo: msg1._id,
    readBy: [{ user: aman._id, readAt: new Date(Date.now() - 3000000) }],
    deliveredTo: [aman._id],
    createdAt: new Date(Date.now() - 3000000),
  });

  const msg3 = await Message.create({
    conversation: directAmanRiya._id,
    sender: aman._id,
    type: 'text',
    content: 'Awesome! Real-time Socket.IO synchronization is working seamlessly too with typing indicators and read ticks.',
    readBy: [{ user: riya._id, readAt: new Date(Date.now() - 1200000) }],
    deliveredTo: [riya._id],
    createdAt: new Date(Date.now() - 1200000),
  });

  directAmanRiya.lastMessage = msg3._id;
  await directAmanRiya.save();

  // 3. Direct Conversation: Aman & Priya
  console.log('💬 [Reset & Seed] Creating direct chat: Aman & Priya...');
  const directKeyAmanPriya = [aman._id.toString(), priya._id.toString()].sort().join('_');
  const directAmanPriya = await Conversation.create({
    type: 'direct',
    directKey: directKeyAmanPriya,
    createdBy: priya._id,
    members: [
      { user: aman._id, role: 'member' },
      { user: priya._id, role: 'member' },
    ],
  });

  const msgP1 = await Message.create({
    conversation: directAmanPriya._id,
    sender: priya._id,
    type: 'text',
    content: 'Hi Aman! Could we sync on the user experience feedback tomorrow morning?',
    deliveredTo: [aman._id],
    createdAt: new Date(Date.now() - 600000),
  });

  directAmanPriya.lastMessage = msgP1._id;
  await directAmanPriya.save();

  // 4. Public Room: "🌊 Ocean Lounge"
  console.log('🌐 [Reset & Seed] Creating Public Room "🌊 Ocean Lounge"...');
  const oceanLounge = await Conversation.create({
    type: 'room',
    name: '🌊 Ocean Lounge',
    description: 'The public lounge for all ConnectX members to hang out, share ideas, and connect.',
    isPublic: true,
    createdBy: aman._id,
    members: createdUsers.map((u) => ({
      user: u._id,
      role: u._id.toString() === aman._id.toString() ? 'admin' : 'member',
    })),
  });

  const rMsg1 = await Message.create({
    conversation: oceanLounge._id,
    sender: aman._id,
    type: 'text',
    content: 'Welcome everyone to the ConnectX Ocean Lounge! Feel free to say hi and share what you are building.',
    deliveredTo: createdUsers.map((u) => u._id),
    readBy: createdUsers.map((u) => ({ user: u._id, readAt: new Date() })),
    createdAt: new Date(Date.now() - 7200000),
  });

  const rMsg2 = await Message.create({
    conversation: oceanLounge._id,
    sender: ananya._id,
    type: 'text',
    content: 'Loving the typography and generous border radius! Feels so calm to read.',
    replyTo: rMsg1._id,
    deliveredTo: createdUsers.map((u) => u._id),
    createdAt: new Date(Date.now() - 5400000),
  });

  const rMsg3 = await Message.create({
    conversation: oceanLounge._id,
    sender: kabir._id,
    type: 'text',
    content: 'Socket handshake authentication and multi-socket presence tracking are rock solid. Ready for real-time scale! 🛡️',
    deliveredTo: createdUsers.map((u) => u._id),
    createdAt: new Date(Date.now() - 1800000),
  });

  oceanLounge.lastMessage = rMsg3._id;
  await oceanLounge.save();

  // 5. Private Group: "🚀 ConnectX Core Team"
  console.log('🔒 [Reset & Seed] Creating Private Group "🚀 ConnectX Core Team"...');
  const coreTeam = await Conversation.create({
    type: 'group',
    name: '🚀 ConnectX Core Team',
    description: 'Private squad room for roadmap planning, sprint goals, and releases.',
    isPublic: false,
    createdBy: aman._id,
    members: [
      { user: aman._id, role: 'admin' },
      { user: riya._id, role: 'admin' },
      { user: priya._id, role: 'member' },
      { user: rohan._id, role: 'member' },
    ],
  });

  const gMsg1 = await Message.create({
    conversation: coreTeam._id,
    sender: rohan._id,
    type: 'text',
    content: 'Database indexing for conversations and messages is in place. Pagination cursor performance is sub-millisecond.',
    deliveredTo: [aman._id, riya._id, priya._id],
    createdAt: new Date(Date.now() - 10000000),
  });

  const gMsg2 = await Message.create({
    conversation: coreTeam._id,
    sender: aman._id,
    type: 'text',
    content: 'Great update Rohan! Client-side uploads and lightbox previews are also fully wired up.',
    deliveredTo: [riya._id, priya._id, rohan._id],
    createdAt: new Date(Date.now() - 8000000),
  });

  coreTeam.lastMessage = gMsg2._id;
  await coreTeam.save();

  // 6. Sample Initial Task
  console.log('📋 [Reset & Seed] Creating sample task for ConnectX Core Team...');
  await Task.create({
    conversation: coreTeam._id,
    title: 'Review production deployment checklist',
    description: 'Ensure SSL, database connection pool, and WebRTC STUN/TURN servers are operational.',
    assignee: rohan._id,
    createdBy: aman._id,
    dueAt: new Date(Date.now() + 86400000 * 2), // 2 days from now
    priority: 'high',
    status: 'open',
    origin: 'manual',
  });

  // 7. Add sample contacts for Aman
  await Contact.create([
    { owner: aman._id, contactUser: riya._id, nickname: 'Riya Lead', favorite: true },
    { owner: aman._id, contactUser: priya._id, nickname: '', favorite: false },
  ]);

  return {
    usersCount: createdUsers.length,
    users: createdUsers.map((u) => ({
      name: u.name,
      email: u.email,
      username: u.username,
    })),
    rooms: [
      { name: oceanLounge.name, type: oceanLounge.type },
      { name: coreTeam.name, type: coreTeam.type },
    ],
  };
}
