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

