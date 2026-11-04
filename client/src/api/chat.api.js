import api from './axios.js';

// ==================== CONVERSATIONS ====================

export const getConversationsApi = async () => {
  const response = await api.get('/conversations');
  return response.data;
};

export const createOrGetDirectConversationApi = async (recipientId) => {
  const response = await api.post('/conversations/direct', { recipientId });
  return response.data;
};

export const createGroupApi = async (groupData) => {
  const response = await api.post('/conversations/group', groupData);
  return response.data;
};

export const getConversationByIdApi = async (conversationId) => {
  const response = await api.get(`/conversations/${conversationId}`);
  return response.data;
};

export const updateConversationApi = async (conversationId, updateData) => {
  const response = await api.put(`/conversations/${conversationId}`, updateData);
  return response.data;
};

export const addMembersApi = async (conversationId, memberIds) => {
  const response = await api.post(`/conversations/${conversationId}/members`, { memberIds });
  return response.data;
};

export const removeMemberApi = async (conversationId, userId) => {
  const response = await api.delete(`/conversations/${conversationId}/members/${userId}`);
  return response.data;
};

export const promoteMemberApi = async (conversationId, userId) => {
  const response = await api.post(`/conversations/${conversationId}/promote`, { userId });
  return response.data;
};

export const leaveConversationApi = async (conversationId) => {
  const response = await api.post(`/conversations/${conversationId}/leave`);
  return response.data;
};

export const discoverRoomsApi = async (query = '') => {
  const response = await api.get('/conversations/rooms/discover', {
    params: { q: query },
  });
  return response.data;
};

export const joinRoomApi = async (conversationId) => {
  const response = await api.post(`/conversations/${conversationId}/join`);
  return response.data;
};

// ==================== MESSAGES ====================

export const getMessagesApi = async (conversationId, { cursor = null, limit = 30 } = {}) => {
  const response = await api.get(`/conversations/${conversationId}/messages`, {
    params: { cursor, limit },
  });
  return response.data;
};

export const sendMessageApi = async (conversationId, messageData) => {
  const response = await api.post(`/conversations/${conversationId}/messages`, messageData);
  return response.data;
};

export const markMessagesAsReadApi = async (conversationId) => {
  const response = await api.post(`/conversations/${conversationId}/read`);
  return response.data;
};

export const deleteMessageApi = async (messageId, scope = 'me') => {
  const response = await api.delete(`/messages/${messageId}`, {
    params: { scope },
  });
  return response.data;
};

// ==================== CHAT MANAGEMENT ====================

export const clearChatApi = async (conversationId, keepStarred = false) => {
  const response = await api.post(`/conversations/${conversationId}/clear`, { keepStarred });
  return response.data;
};

export const deleteChatApi = async (conversationId, exitGroup = false) => {
  const response = await api.post(`/conversations/${conversationId}/delete`, { exitGroup });
  return response.data;
};

export const archiveChatApi = async (conversationId, archived) => {
  const response = await api.put(`/conversations/${conversationId}/archive`, { archived });
  return response.data;
};

export const pinChatApi = async (conversationId, pinned) => {
  const response = await api.put(`/conversations/${conversationId}/pin`, { pinned });
  return response.data;
};

export const muteChatApi = async (conversationId, duration) => {
  const response = await api.put(`/conversations/${conversationId}/mute`, { duration });
  return response.data;
};

export const markUnreadApi = async (conversationId, unread = true) => {
  const response = await api.put(`/conversations/${conversationId}/unread`, { unread });
  return response.data;
};

export const setWallpaperApi = async (conversationId, wallpaper) => {
  const response = await api.put(`/conversations/${conversationId}/wallpaper`, { wallpaper });
  return response.data;
};

export const exportChatApi = async (conversationId) => {
  const response = await api.get(`/conversations/${conversationId}/export`, {
    responseType: 'blob',
  });
  return response.data;
};

export const updateDisappearingApi = async (conversationId, durationSec) => {
  const response = await api.put(`/conversations/${conversationId}/disappearing`, { durationSec });
  return response.data;
};
export const setDisappearingMessagesApi = updateDisappearingApi;

// ==================== MESSAGE ACTIONS ====================

export const editMessageApi = async (messageId, content) => {
  const response = await api.put(`/messages/${messageId}`, { content });
  return response.data;
};

export const forwardMessagesApi = async (targetConversationIds, messageIds) => {
  const response = await api.post('/messages/forward', { 
    targetConversationIds: Array.isArray(targetConversationIds) ? targetConversationIds : [], 
    messageIds: Array.isArray(messageIds) ? messageIds : [] 
  });
  return response.data;
};

export const starMessageApi = async (messageId) => {
  const response = await api.post(`/messages/${messageId}/star`);
  return response.data;
};

export const unstarMessageApi = async (messageId) => {
  const response = await api.delete(`/messages/${messageId}/star`);
  return response.data;
};

export const getStarredMessagesApi = async (conversationId = '') => {
  const response = await api.get('/messages/starred', {
    params: conversationId ? { conversationId } : {},
  });
  return response.data;
};

export const reactToMessageApi = async (messageId, emoji) => {
  const response = await api.post(`/messages/${messageId}/reactions`, { emoji });
  return response.data;
};

export const pinMessageApi = async (conversationId, messageId) => {
  const response = await api.post(`/conversations/${conversationId}/pin-message`, { messageId });
  return response.data;
};

export const unpinMessageApi = async (conversationId, messageId) => {
  const response = await api.delete(`/conversations/${conversationId}/pin-message/${messageId}`);
  return response.data;
};

export const votePollApi = async (messageId, optionId) => {
  const response = await api.post(`/messages/${messageId}/vote`, { optionId });
  return response.data;
};

// ==================== GROUP EXTRAS ====================

export const getInviteLinkApi = async (conversationId) => {
  const response = await api.post(`/conversations/${conversationId}/invite-link`);
  return response.data;
};

export const revokeInviteLinkApi = async (conversationId) => {
  const response = await api.post(`/conversations/${conversationId}/revoke-invite-link`);
  return response.data;
};

export const getGroupByTokenApi = async (token) => {
  const response = await api.get(`/conversations/join/${token}`);
  return response.data;
};

export const joinGroupByTokenApi = async (token) => {
  const response = await api.post(`/conversations/join/${token}`);
  return response.data;
};

export const updateGroupPermissionsApi = async (conversationId, permissions) => {
  const response = await api.put(`/conversations/${conversationId}/permissions`, permissions);
  return response.data;
};

export const deleteGroupApi = async (conversationId) => {
  const response = await api.delete(`/conversations/${conversationId}/delete-group`);
  return response.data;
};

// ==================== CONTACTS, BLOCK & SETTINGS ====================

export const getContactsApi = async () => {
  const response = await api.get('/contacts');
  return response.data;
};

export const addContactApi = async (contactUserId, nickname = '') => {
  const response = await api.post('/contacts', { contactUserId, nickname });
  return response.data;
};

export const updateContactApi = async (id, data) => {
  const response = await api.put(`/contacts/${id}`, data);
  return response.data;
};

export const deleteContactApi = async (id, deleteChat = false) => {
  const response = await api.delete(`/contacts/${id}`, { params: { deleteChat } });
  return response.data;
};

export const getSharedMediaApi = async (userId) => {
  const response = await api.get(`/contacts/${userId}/shared-media`);
  return response.data;
};

export const getGroupsInCommonApi = async (userId) => {
  const response = await api.get(`/contacts/${userId}/groups-in-common`);
  return response.data;
};

export const getBlockedUsersApi = async () => {
  const response = await api.get('/blocks');
  return response.data;
};

export const blockUserApi = async (userId, data = {}) => {
  const response = await api.post(`/blocks/${userId}`, data);
  return response.data;
};

export const unblockUserApi = async (userId) => {
  const response = await api.delete(`/blocks/${userId}`);
  return response.data;
};

export const reportApi = async (data) => {
  const response = await api.post('/reports', data);
  return response.data;
};

export const getPrivacySettingsApi = async () => {
  const response = await api.get('/settings/privacy');
  return response.data;
};

export const updatePrivacySettingsApi = async (data) => {
  const response = await api.put('/settings/privacy', data);
  return response.data;
};

export const getNotificationSettingsApi = async () => {
  const response = await api.get('/settings/notifications');
  return response.data;
};

export const updateNotificationSettingsApi = async (data) => {
  const response = await api.put('/settings/notifications', data);
  return response.data;
};

export const getChatPreferencesApi = async () => {
  const response = await api.get('/settings/chat-preferences');
  return response.data;
};

export const updateChatPreferencesApi = async (data) => {
  const response = await api.put('/settings/chat-preferences', data);
  return response.data;
};

// ==================== STICKERS & GIFS ====================

export const getStickerPacksApi = async () => {
  const response = await api.get('/stickers/packs');
  return response.data;
};

export const getStickersInPackApi = async (packId) => {
  const response = await api.get(`/stickers/packs/${packId}`);
  return response.data;
};

export const getRecentsAndFavoritesApi = async () => {
  const response = await api.get('/stickers/recents');
  return response.data;
};

export const favoriteStickerApi = async (stickerId) => {
  const response = await api.post(`/stickers/${stickerId}/favorite`);
  return response.data;
};

export const unfavoriteStickerApi = async (stickerId) => {
  const response = await api.delete(`/stickers/${stickerId}/favorite`);
  return response.data;
};

export const recordStickerUsedApi = async (stickerId) => {
  const response = await api.post(`/stickers/${stickerId}/used`);
  return response.data;
};

export const getTrendingGifsApi = async (limit = 20, offset = 0) => {
  const response = await api.get('/stickers/gifs/trending', { params: { limit, offset } });
  return response.data;
};

export const searchGifsApi = async (q, limit = 20, offset = 0) => {
  const response = await api.get('/stickers/gifs/search', { params: { q, limit, offset } });
  return response.data;
};

export const getLinkPreviewApi = async (url) => {
  const response = await api.get('/stickers/link-preview', { params: { url } });
  return response.data;
};

// ==================== CALLS ====================

export const getCallHistoryApi = async () => {
  const response = await api.get('/calls');
  return response.data;
};

export const deleteCallRecordApi = async (callId) => {
  const response = await api.delete(`/calls/${callId}`);
  return response.data;
};

export const getIceServersApi = async () => {
  const response = await api.get('/calls/ice-servers');
  return response.data;
};

