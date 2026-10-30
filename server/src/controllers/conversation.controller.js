import mongoose from 'mongoose';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';

/**
 * Get all conversations for current user with unread counts & latest message
 * GET /api/conversations
 */
export const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Conversation.find({
      'members.user': currentUserId,
    })
      .populate('members.user', '_id name username avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: '_id name username avatar',
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Compute unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const memberInfo = conv.members.find((m) =>
          m.user?._id?.toString() === currentUserId.toString()
        );

        // Count messages sent by others that have not been read by current user and not deleted
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: currentUserId },
          'readBy.user': { $ne: currentUserId },
          deletedFor: { $ne: currentUserId },
          isDeletedForEveryone: false,
        });

        return {
          ...conv,
          unreadCount,
          lastReadMessage: memberInfo?.lastReadMessage || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: {
        conversations: conversationsWithUnread,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start or retrieve a 1-to-1 direct conversation
 * POST /api/conversations/direct
 */
export const createOrGetDirectConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient user ID is required',
        data: null,
      });
    }

    if (recipientId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot start a direct conversation with yourself',
        data: null,
      });
    }

    const recipient = await User.findById(recipientId).select('_id name username avatar isOnline lastSeen');
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found',
        data: null,
      });
    }

    // Deterministic key to prevent race conditions or duplicate 1-to-1 chats
    const directKey = [currentUserId.toString(), recipientId.toString()].sort().join('_');

    let conversation = await Conversation.findOne({ directKey })
      .populate('members.user', '_id name username avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: '_id name username avatar',
        },
      });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        createdBy: currentUserId,
        directKey,
        members: [
          { user: currentUserId, role: 'member' },
          { user: recipientId, role: 'member' },
        ],
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('members.user', '_id name username avatar isOnline lastSeen');
    }

    return res.status(200).json({
      success: true,
      message: 'Direct conversation ready',
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new group conversation
 * POST /api/conversations/group
 */
export const createGroupConversation = async (req, res, next) => {
  try {
    const { name, description = '', avatar = '', memberIds = [], isPublic = false, type = 'group' } = req.body;
    const currentUserId = req.user._id;

    const trimmedName = (name || '').trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Group/Room name must be between 2 and 60 characters long',
        data: null,
      });
    }

    // Prepare distinct member list ensuring creator is admin
    const distinctMemberIds = [
      ...new Set(memberIds.map((id) => id.toString()).filter((id) => id !== currentUserId.toString())),
    ];

    const members = [
      { user: currentUserId, role: 'admin', joinedAt: new Date() },
      ...distinctMemberIds.map((id) => ({ user: id, role: 'member', joinedAt: new Date() })),
    ];

    const conversationType = isPublic ? 'room' : (type === 'room' ? 'room' : 'group');

    const conversation = await Conversation.create({
      type: conversationType,
      name: trimmedName,
      description: description.trim(),
      avatar,
      members,
      createdBy: currentUserId,
      isPublic: Boolean(isPublic),
    });

    // Create system message announcement
    const systemMessage = await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: 'system',
      content: `${req.user.name} created the ${conversationType} "${trimmedName}"`,
      deliveredTo: [currentUserId],
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    conversation.lastMessage = systemMessage._id;
    await conversation.save();

    const populated = await Conversation.findById(conversation._id)
      .populate('members.user', '_id name username avatar isOnline lastSeen')
      .populate('createdBy', '_id name username')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: '_id name username avatar' },
      });

    return res.status(201).json({
      success: true,
      message: 'Group created successfully!',
      data: { conversation: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single conversation by ID
 * GET /api/conversations/:id
 */
export const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(id)
      .populate('members.user', '_id name username avatar bio status isOnline lastSeen')
      .populate('createdBy', '_id name username avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: '_id name username avatar' },
      });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const isMember = conversation.members.some(
      (m) => m.user?._id?.toString() === currentUserId.toString()
    );

    // If not a member and not a public room, deny access
    if (!isMember && !conversation.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this conversation',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation retrieved',
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update group or room details (admin only)
 * PUT /api/conversations/:id
 */
export const updateConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, avatar } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const userMember = conversation.members.find(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only conversation admins can update group details',
        data: null,
      });
    }

    if (name !== undefined) conversation.name = name.trim();
    if (description !== undefined) conversation.description = description.trim();
    if (avatar !== undefined) conversation.avatar = avatar;

    await conversation.save();

    // Create system message
    await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: 'system',
      content: `${req.user.name} updated the conversation info`,
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    const updated = await Conversation.findById(id)
      .populate('members.user', '_id name username avatar isOnline lastSeen')
      .populate('createdBy', '_id name username');

    return res.status(200).json({
      success: true,
      message: 'Conversation updated successfully',
      data: { conversation: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add members to a group (admin only)
 * POST /api/conversations/:id/members
 */
export const addMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberIds = [] } = req.body;
    const currentUserId = req.user._id;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one user ID to add',
        data: null,
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const userMember = conversation.members.find(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can add new members',
        data: null,
      });
    }

    const existingMemberMap = new Set(
      conversation.members.map((m) => m.user.toString())
    );

    const newlyAddedIds = memberIds.filter((mId) => !existingMemberMap.has(mId.toString()));

    if (newlyAddedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected users are already members of this conversation',
        data: null,
      });
    }

    for (const newId of newlyAddedIds) {
      conversation.members.push({
        user: newId,
        role: 'member',
        joinedAt: new Date(),
      });
    }

    await conversation.save();

    // Fetch names of added users for system message
    const addedUsers = await User.find({ _id: { $in: newlyAddedIds } }).select('name');
    const names = addedUsers.map((u) => u.name).join(', ');

    await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: 'system',
      content: `${req.user.name} added ${names} to the group`,
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    const updated = await Conversation.findById(id)
      .populate('members.user', '_id name username avatar isOnline lastSeen');

    return res.status(200).json({
      success: true,
      message: 'Members added successfully',
      data: { conversation: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a member from a group (admin only)
 * DELETE /api/conversations/:id/members/:userId
 */
export const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const requesterMember = conversation.members.find(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (!requesterMember || requesterMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove members from the conversation',
        data: null,
      });
    }

    // Prevent removing the original creator
    if (conversation.createdBy.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'The group creator cannot be removed from the conversation',
        data: null,
      });
    }

    const removedUser = await User.findById(userId).select('name');

    conversation.members = conversation.members.filter(
      (m) => m.user.toString() !== userId.toString()
    );

    await conversation.save();

    await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: 'system',
      content: `${req.user.name} removed ${removedUser?.name || 'a member'} from the group`,
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    return res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Leave a group or room
 * POST /api/conversations/:id/leave
 */
export const leaveConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    // Check if creator is leaving while others remain
    const isCreator = conversation.createdBy.toString() === currentUserId.toString();
    const otherMembers = conversation.members.filter(
      (m) => m.user.toString() !== currentUserId.toString()
    );

    if (isCreator && otherMembers.length > 0) {
      // Must promote another member to admin / transfer creator before leaving
      const hasOtherAdmin = otherMembers.some((m) => m.role === 'admin');
      if (!hasOtherAdmin) {
        // Auto-promote oldest remaining member to admin
        otherMembers[0].role = 'admin';
        conversation.createdBy = otherMembers[0].user;
      }
    }

    conversation.members = otherMembers;
    await conversation.save();

    await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: 'system',
      content: `${req.user.name} left the group`,
      readBy: [],
    });

    return res.status(200).json({
      success: true,
      message: 'You have left the conversation',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Discover public rooms
 * GET /api/conversations/rooms/discover?q=
 */
export const discoverRooms = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const currentUserId = req.user._id;
    const filter = { isPublic: true };

    if (q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const rooms = await Conversation.find(filter)
      .populate('createdBy', '_id name username avatar')
      .sort({ updatedAt: -1 })
      .lean();

    const formattedRooms = rooms.map((room) => ({
      ...room,
      memberCount: room.members.length,
      hasJoined: room.members.some(
        (m) => m.user?.toString() === currentUserId.toString()
      ),
    }));

    return res.status(200).json({
      success: true,
      message: 'Public rooms retrieved',
      data: { rooms: formattedRooms },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Join a public room
 * POST /api/conversations/:id/join
 */
export const joinRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const room = await Conversation.findOne({ _id: id, isPublic: true });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Public room not found or not open for public joining',
        data: null,
      });
    }

    const alreadyMember = room.members.some(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (!alreadyMember) {
      room.members.push({
        user: currentUserId,
        role: 'member',
        joinedAt: new Date(),
      });
      await room.save();

      await Message.create({
        conversation: room._id,
        sender: currentUserId,
        type: 'system',
        content: `${req.user.name} joined the room`,
        readBy: [{ user: currentUserId, readAt: new Date() }],
      });
    }

    const populated = await Conversation.findById(id)
      .populate('members.user', '_id name username avatar isOnline lastSeen')
      .populate('createdBy', '_id name username');

    return res.status(200).json({
      success: true,
      message: 'Joined room successfully!',
      data: { conversation: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Promote member to admin
 * POST /api/conversations/:id/promote
 */
export const promoteMemberToAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const requesterMember = conversation.members.find(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (!requesterMember || requesterMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can promote other members',
        data: null,
      });
    }

    const targetMember = conversation.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this conversation',
        data: null,
      });
    }

    targetMember.role = 'admin';
    await conversation.save();

    const targetUser = await User.findById(userId).select('name');
    await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: 'system',
      content: `${req.user.name} promoted ${targetUser?.name || 'a member'} to Admin`,
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    const populated = await Conversation.findById(id)
      .populate('members.user', '_id name username avatar isOnline lastSeen');

    return res.status(200).json({
      success: true,
      message: 'Member promoted to admin successfully',
      data: { conversation: populated },
    });
  } catch (error) {
    next(error);
  }
};

