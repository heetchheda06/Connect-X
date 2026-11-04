import Contact from '../models/contact.model.js';
import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import ConversationUserState from '../models/conversationUserState.model.js';

/**
 * Get contacts list for current user
 * GET /api/contacts
 */
export const getContacts = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const contacts = await Contact.find({ owner: currentUserId })
      .populate('contactUser', '_id name username avatar bio status isOnline lastSeen privacy')
      .sort({ favorite: -1, addedAt: -1 })
      .lean();

    // Respect privacy settings of contact users
    const sanitized = contacts.map((c) => {
      const u = c.contactUser;
      if (!u) return c;

      const p = u.privacy || {};
      const hideLastSeen = p.lastSeen === 'nobody';
      const hideOnline = p.online === 'sameAsLastSeen' && hideLastSeen;
      const hidePhoto = p.profilePhoto === 'nobody';
      const hideAbout = p.about === 'nobody';

      return {
        ...c,
        contactUser: {
          _id: u._id,
          name: u.name,
          username: u.username,
          avatar: hidePhoto ? '' : u.avatar,
          bio: hideAbout ? '' : u.bio,
          status: hideAbout ? '' : u.status,
          isOnline: hideOnline ? false : u.isOnline,
          lastSeen: hideLastSeen ? null : u.lastSeen,
        },
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: {
        contacts: sanitized,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a user to contacts
 * POST /api/contacts
 */
export const addContact = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { contactUserId, nickname = '' } = req.body;

    if (!contactUserId) {
      return res.status(400).json({
        success: false,
        message: 'Contact user ID is required',
        data: null,
      });
    }

    if (contactUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as a contact',
        data: null,
      });
    }

    const targetUser = await User.findById(contactUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    let contact = await Contact.findOne({
      owner: currentUserId,
      contactUser: contactUserId,
    });

    if (contact) {
      contact.nickname = nickname.trim();
      await contact.save();
    } else {
      contact = await Contact.create({
        owner: currentUserId,
        contactUser: contactUserId,
        nickname: nickname.trim(),
        addedAt: new Date(),
      });
    }

    const populated = await Contact.findById(contact._id).populate(
      'contactUser',
      '_id name username avatar bio status isOnline lastSeen'
    );

    return res.status(201).json({
      success: true,
      message: 'Contact saved successfully',
      data: { contact: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update contact nickname or favorite status
 * PUT /api/contacts/:id
 */
export const updateContact = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { id } = req.params;
    const { nickname, favorite } = req.body;

    const contact = await Contact.findOne({
      _id: id,
      owner: currentUserId,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
        data: null,
      });
    }

    if (typeof nickname === 'string') {
      contact.nickname = nickname.trim();
    }
    if (typeof favorite === 'boolean') {
      contact.favorite = favorite;
    }

    await contact.save();

    const populated = await Contact.findById(contact._id).populate(
      'contactUser',
      '_id name username avatar bio status isOnline lastSeen'
    );

    return res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: { contact: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a contact (removes contact entry; conversation is preserved unless deleteChat=true)
 * DELETE /api/contacts/:id?deleteChat=true|false
 */
export const deleteContact = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { id } = req.params;
    const { deleteChat = false } = req.query;

    const contact = await Contact.findOne({
      _id: id,
      owner: currentUserId,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
        data: null,
      });
    }

    const targetUserId = contact.contactUser;
    await Contact.deleteOne({ _id: id });

    // If user chose to also delete chat with this contact
    if (deleteChat === 'true' || deleteChat === true) {
      const directKey = [currentUserId.toString(), targetUserId.toString()].sort().join('_');
      const directConv = await Conversation.findOne({ directKey });
      if (directConv) {
        await ConversationUserState.updateOne(
          { user: currentUserId, conversation: directConv._id },
          {
            $set: {
              hidden: true,
              clearedAt: new Date(),
              pinnedAt: null,
              archived: false,
            },
          },
          { upsert: true }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
      data: { contactId: id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get shared media, links, and documents with a contact or conversation
 * GET /api/contacts/:userId/shared-media
 */
export const getSharedMedia = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { userId: otherUserId } = req.params;

    // Find direct conversation between current user and other user
    const directKey = [currentUserId.toString(), otherUserId.toString()].sort().join('_');
    const conversation = await Conversation.findOne({ directKey });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: { media: [], links: [], docs: [] },
      });
    }

    const state = await ConversationUserState.findOne({
      user: currentUserId,
      conversation: conversation._id,
    }).lean();

    const query = {
      conversation: conversation._id,
      deletedFor: { $ne: currentUserId },
      isDeletedForEveryone: false,
    };

    if (state?.clearedAt) {
      if (state.keepStarredOnClear) {
        query.$or = [{ createdAt: { $gt: state.clearedAt } }, { starredBy: currentUserId }];
      } else {
        query.createdAt = { $gt: state.clearedAt };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const media = [];
    const links = [];
    const docs = [];

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    for (const m of messages) {
      if (m.attachment) {
        const mime = m.attachment.mimeType || '';
        if (mime.startsWith('image/') || mime.startsWith('video/')) {
          media.push({
            messageId: m._id,
            url: m.attachment.url,
            name: m.attachment.name,
            mimeType: mime,
            createdAt: m.createdAt,
          });
        } else {
          docs.push({
            messageId: m._id,
            url: m.attachment.url,
            name: m.attachment.name,
            size: m.attachment.size,
            mimeType: mime,
            createdAt: m.createdAt,
          });
        }
      }

      if (m.linkPreview) {
        links.push({
          messageId: m._id,
          ...m.linkPreview,
          createdAt: m.createdAt,
        });
      } else if (m.content) {
        const matches = m.content.match(urlRegex);
        if (matches) {
          for (const u of matches) {
            links.push({
              messageId: m._id,
              url: u,
              title: u,
              createdAt: m.createdAt,
            });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: { media, links, docs },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get common groups between current user and target user
 * GET /api/contacts/:userId/groups-in-common
 */
export const getGroupsInCommon = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { userId: otherUserId } = req.params;

    const commonGroups = await Conversation.find({
      type: { $in: ['group', 'room'] },
      $and: [
        { 'members.user': currentUserId },
        { 'members.user': otherUserId },
      ],
    })
      .select('_id name description avatar members type')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        groups: commonGroups.map((g) => ({
          _id: g._id,
          name: g.name,
          avatar: g.avatar,
          memberCount: g.members.length,
          type: g.type,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

