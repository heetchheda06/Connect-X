import Call from '../models/call.model.js';
import Block from '../models/block.model.js';
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';

export function registerCallSocketHandlers(io, socket) {
  const user = socket.user;
  const userId = user._id.toString();

  // 1. Start a call (invite)
  socket.on('call:invite', async ({ conversationId, calleeId, type = 'voice' }) => {
    try {
      if (!conversationId || !calleeId) return;

      // Check block status
      const isBlocked = await Block.exists({
        $or: [
          { blocker: calleeId, blocked: userId },
          { blocker: userId, blocked: calleeId },
        ],
      });

      if (isBlocked) {
        return socket.emit('call:failed', {
          message: 'Unable to connect call.',
        });
      }

      const call = await Call.create({
        caller: userId,
        callee: calleeId,
        conversation: conversationId,
        type: type === 'video' ? 'video' : 'voice',
        status: 'ringing',
        startedAt: new Date(),
      });

      socket.emit('call:ringing', {
        callId: call._id,
        conversationId,
        calleeId,
        type: call.type,
      });

      io.to(`user:${calleeId}`).emit('call:incoming', {
        callId: call._id,
        conversationId,
        caller: {
          _id: user._id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
        type: call.type,
      });
    } catch (err) {
      console.error('[Call Error] call:invite:', err.message);
      socket.emit('call:failed', { message: 'Could not initiate call' });
    }
  });

  // 2. Accept call
  socket.on('call:accept', async ({ callId }) => {
    try {
      if (!callId) return;

      const call = await Call.findById(callId);
      if (!call) return;

      call.status = 'accepted';
      call.answeredAt = new Date();
      await call.save();

      io.to(`user:${call.caller.toString()}`).emit('call:accepted', {
        callId,
        calleeId: userId,
      });

      socket.emit('call:accepted', {
        callId,
        callerId: call.caller.toString(),
      });
    } catch (err) {
      console.error('[Call Error] call:accept:', err.message);
    }
  });

  // 3. Reject call
  socket.on('call:reject', async ({ callId, reason = 'declined' }) => {
    try {
      if (!callId) return;

      const call = await Call.findById(callId);
      if (!call) return;

      call.status = 'rejected';
      call.endedAt = new Date();
      await call.save();

      io.to(`user:${call.caller.toString()}`).emit('call:rejected', {
        callId,
        reason,
      });

      // Insert in-chat event line
      const typeLabel = call.type === 'video' ? 'Video call' : 'Voice call';
      const callMsg = await Message.create({
        conversation: call.conversation,
        sender: userId,
        type: 'call',
        content: `Declined ${typeLabel}`,
        call: {
          type: call.type,
          status: 'rejected',
          durationSec: 0,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
        },
        deliveredTo: [call.caller, call.callee],
        readBy: [{ user: userId, readAt: new Date() }],
      });

      const populated = await Message.findById(callMsg._id).populate(
        'sender',
        '_id name username avatar'
      );
      io.to(`conversation:${call.conversation}`).emit('message:new', {
        conversationId: call.conversation,
        message: populated,
      });
    } catch (err) {
      console.error('[Call Error] call:reject:', err.message);
    }
  });

  // 4. Cancel call (caller hangs up before answer)
  socket.on('call:cancel', async ({ callId }) => {
    try {
      if (!callId) return;

      const call = await Call.findById(callId);
      if (!call) return;

      call.status = 'missed';
      call.endedAt = new Date();
      await call.save();

      io.to(`user:${call.callee.toString()}`).emit('call:cancelled', {
        callId,
      });

      // Insert in-chat missed call event line
      const typeLabel = call.type === 'video' ? 'video call' : 'voice call';
      const callMsg = await Message.create({
        conversation: call.conversation,
        sender: userId,
        type: 'call',
        content: `Missed ${typeLabel}`,
        call: {
          type: call.type,
          status: 'missed',
          durationSec: 0,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
        },
        deliveredTo: [call.caller, call.callee],
        readBy: [{ user: userId, readAt: new Date() }],
      });

      const populated = await Message.findById(callMsg._id).populate(
        'sender',
        '_id name username avatar'
      );
      io.to(`conversation:${call.conversation}`).emit('message:new', {
        conversationId: call.conversation,
        message: populated,
      });
    } catch (err) {
      console.error('[Call Error] call:cancel:', err.message);
    }
  });

  // 5. Callee Busy
  socket.on('call:busy', async ({ callId }) => {
    try {
      if (!callId) return;

      const call = await Call.findById(callId);
      if (!call) return;

      call.status = 'busy';
      call.endedAt = new Date();
      await call.save();

      io.to(`user:${call.caller.toString()}`).emit('call:busy', { callId });
    } catch (err) {
      console.error('[Call Error] call:busy:', err.message);
    }
  });

  // 6. WebRTC Signaling: Offer, Answer, ICE Candidates
  socket.on('call:offer', ({ callId, sdp, targetUserId }) => {
    if (!targetUserId || !sdp) return;
    io.to(`user:${targetUserId}`).emit('call:offer', {
      callId,
      sdp,
      senderId: userId,
    });
  });

  socket.on('call:answer', ({ callId, sdp, targetUserId }) => {
    if (!targetUserId || !sdp) return;
    io.to(`user:${targetUserId}`).emit('call:answer', {
      callId,
      sdp,
      senderId: userId,
    });
  });

  socket.on('call:ice-candidate', ({ callId, candidate, targetUserId }) => {
    if (!targetUserId || !candidate) return;
    io.to(`user:${targetUserId}`).emit('call:ice-candidate', {
      callId,
      candidate,
      senderId: userId,
    });
  });

  // 7. Media state sync (mute, camera, screen share)
  socket.on('call:media-state', ({ callId, targetUserId, isMuted, isCameraOff, isScreenSharing }) => {
    if (!targetUserId) return;
    io.to(`user:${targetUserId}`).emit('call:media-state', {
      callId,
      senderId: userId,
      isMuted,
      isCameraOff,
      isScreenSharing,
    });
  });

  // 8. End call
  socket.on('call:end', async ({ callId, durationSec = 0 }) => {
    try {
      if (!callId) return;

      const call = await Call.findById(callId);
      if (!call) return;

      call.status = 'ended';
      call.endedAt = new Date();
      call.durationSec = Math.max(0, parseInt(durationSec, 10) || 0);
      await call.save();

      const peerId =
        call.caller.toString() === userId ? call.callee.toString() : call.caller.toString();

      io.to(`user:${peerId}`).emit('call:ended', {
        callId,
        endedBy: userId,
        durationSec: call.durationSec,
      });

      // Format duration
      const mins = Math.floor(call.durationSec / 60);
      const secs = call.durationSec % 60;
      const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      const typeLabel = call.type === 'video' ? 'Video call' : 'Voice call';

      const callMsg = await Message.create({
        conversation: call.conversation,
        sender: userId,
        type: 'call',
        content: `${typeLabel} · ${durationStr}`,
        call: {
          type: call.type,
          status: 'ended',
          durationSec: call.durationSec,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
        },
        deliveredTo: [call.caller, call.callee],
        readBy: [{ user: userId, readAt: new Date() }],
      });

      const populated = await Message.findById(callMsg._id).populate(
        'sender',
        '_id name username avatar'
      );
      io.to(`conversation:${call.conversation}`).emit('message:new', {
        conversationId: call.conversation,
        message: populated,
      });
    } catch (err) {
      console.error('[Call Error] call:end:', err.message);
    }
  });
}

export default registerCallSocketHandlers;
