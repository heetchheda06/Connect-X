import api from './axios.js';

export const searchUsersApi = async (query = '') => {
  const response = await api.get('/users/search', {
    params: { q: query },
  });
  return response.data;
};

export const getUserByIdApi = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateProfileApi = async (profileData) => {
  const response = await api.put('/users/profile', profileData);
  return response.data;
};

export const uploadAvatarApi = async (formData) => {
  const response = await api.post('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

