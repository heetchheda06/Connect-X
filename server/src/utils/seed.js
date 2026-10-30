import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectx';

async function seed() {
  console.log('🌱 [Seed] Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ [Seed] Connected to database.');

  console.log('🧹 [Seed] Clearing existing Users, Conversations, and Messages...');
  await Promise.all([
    User.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
  ]);
  console.log('✨ [Seed] Database cleared.');

  // Password for all demo users (passed in plain text so Mongoose pre('save') hashes it once)
  const rawPassword = 'Password123!';

  // 1. Create 6 Demo Users
  console.log('👥 [Seed] Creating demo users...');
  const usersData = [
    {
      name: 'Aman Verma',
      username: 'aman_v',
      email: 'aman@example.com',
      password: rawPassword,
      bio: 'Frontend architect & design system enthusiast 🌊',
      status: 'Crafting calm interfaces with ocean vibes',
    },
    {
      name: 'Riya Sen',
      username: 'riya_s',
      email: 'riya@example.com',
      password: rawPassword,
      bio: 'Full-stack developer • Building high-performance real-time apps 🚀',
      status: 'In the zone 🎧',
    },
    {
      name: 'Priya Sharma',
      username: 'priya_sharma',
      email: 'priya@example.com',
      password: rawPassword,
      bio: 'Product strategist, UX researcher & coffee lover ☕',
      status: 'Reviewing user journeys',
    },
    {
      name: 'Rohan Mehta',
      username: 'rohan_m',
      email: 'rohan@example.com',
      password: rawPassword,
      bio: 'Cloud infrastructure & distributed systems engineer ☁️',
      status: 'Deploying services with zero downtime',
    },
    {
      name: 'Ananya Iyer',
      username: 'ananya_i',
      email: 'ananya@example.com',
      password: rawPassword,
      bio: 'Lead product designer • Living in Figma & CSS 🎨',
      status: 'Polishing micro-interactions',
    },
    {
      name: 'Kabir Joshi',
      username: 'kabir_j',
      email: 'kabir@example.com',
      password: rawPassword,
      bio: 'Security researcher & open-source contributor 🛡️',
      status: 'Auditing protocols',
    },
  ];

  const createdUsers = await User.create(usersData);
  const [aman, riya, priya, rohan, ananya, kabir] = createdUsers;
  console.log(`✅ [Seed] Created ${createdUsers.length} users.`);

  // 2. Direct Conversation: Aman & Riya
  console.log('💬 [Seed] Creating direct chat between Aman & Riya...');
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

  // 3. Direct Conversation: Aman & Priya (with unread message for Aman)
  console.log('💬 [Seed] Creating direct chat between Aman & Priya...');
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
  console.log('🌐 [Seed] Creating Public Room "🌊 Ocean Lounge"...');
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
  console.log('🔒 [Seed] Creating Private Group "🚀 ConnectX Core Team"...');
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

  // 6. Summary Output
  console.log('\n======================================================');
  console.log('🎉 [ConnectX] Database Seeding Complete!');
  console.log('======================================================');
  console.log('Default Password for all users: Password123!\n');
  console.log('Demo Accounts:');
  createdUsers.forEach((u) => {
    console.log(`  • ${u.name.padEnd(16)} | Email: ${u.email.padEnd(20)} | Username: @${u.username}`);
  });
  console.log('\nSample Channels:');
  console.log(`  • [Public Room]  🌊 Ocean Lounge (${oceanLounge.members.length} members)`);
  console.log(`  • [Private Group] 🚀 ConnectX Core Team (${coreTeam.members.length} members)`);
  console.log(`  • [Direct Chats]  Aman & Riya, Aman & Priya`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  console.log('👋 [Seed] Disconnected from MongoDB. Exiting cleanly.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ [Seed] Error during seeding:', err);
  process.exit(1);
});
