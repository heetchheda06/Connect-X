import api from './axios.js';

export const uploadFileApi = async (input, onProgress) => {
  let formData;
  if (input instanceof FormData) {
    formData = input;
  } else if (input instanceof File || input instanceof Blob) {
    formData = new FormData();
    formData.append('file', input, input.name || 'file');
  } else {
    throw new Error('Invalid file format provided for upload');
  }

  const response = await api.post('/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return response.data;
};

