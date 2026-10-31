import api from './axios.js';

export const uploadFileApi = async (formData, onProgress) => {
  const response = await api.post('/uploads', formData, {
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return response.data;
};

