import api from './axios.js';

export const getVapidKeyApi = async () => {
  const response = await api.get('/push/vapid-key');
  return response.data;
};

export const subscribePushApi = async (subscription, deviceLabel) => {
  const response = await api.post('/push/subscribe', { subscription, deviceLabel });
  return response.data;
};

export const unsubscribePushApi = async (endpoint) => {
  const response = await api.post('/push/unsubscribe', { endpoint });
  return response.data;
};
