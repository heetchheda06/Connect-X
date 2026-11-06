import api from './axios.js';

export const registerApi = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginApi = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const googleAuthApi = async (idToken) => {
  const response = await api.post('/auth/google', { idToken });
  return response.data;
};

export const setPasswordApi = async (password) => {
  const response = await api.post('/auth/set-password', { password });
  return response.data;
};

export const getAuthProvidersApi = async () => {
  const response = await api.get('/auth/providers');
  return response.data;
};

export const unlinkGoogleApi = async () => {
  const response = await api.post('/auth/unlink-google');
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logoutApi = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const exportDataApi = async () => {
  const response = await api.get('/auth/export-data', {
    responseType: 'blob',
  });
  return response.data;
};

export const deleteAccountApi = async ({ password, reason } = {}) => {
  const response = await api.post('/auth/delete-account', { password, reason });
  return response.data;
};

export const cancelAccountDeletionApi = async () => {
  const response = await api.post('/auth/cancel-deletion');
  return response.data;
};
