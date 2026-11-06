import { getVapidKeyApi, subscribePushApi, unsubscribePushApi } from '../api/push.api.js';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerPushSubscription() {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied or dismissed.');
  }

  // Fetch VAPID public key from backend
  const res = await getVapidKeyApi();
  const vapidKey = res?.data?.publicKey;
  if (!vapidKey) {
    throw new Error('Push service VAPID public key is not configured.');
  }

  // Ensure service worker is registered and ready
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js');
  }
  await navigator.serviceWorker.ready;

  // Subscribe with PushManager
  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  // Save subscription to backend
  await subscribePushApi(subscription.toJSON(), navigator.userAgent || 'Web Browser');
  return true;
}

export async function unregisterPushSubscription() {
  if (!('serviceWorker' in navigator)) return false;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    try {
      await unsubscribePushApi(subscription.endpoint);
    } catch {
      // Ignore network errors when unsubscribing
    }
    await subscription.unsubscribe();
  }
  return true;
}
