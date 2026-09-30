import { API_BASE_URL } from '../api.js';

/**
 * Convert a base64 string to a Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the browser supports Push Notifications and Service Workers
 */
export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission
 */
export function getNotificationPermission() {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', or 'default'
}

/**
 * Register the Service Worker
 */
export async function registerServiceWorker() {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check if currently subscribed to push notifications
 */
export async function checkIsSubscribed() {
  if (!isPushNotificationSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch (err) {
    console.warn('Error checking push subscription:', err);
    return false;
  }
}

/**
 * Subscribe user to Push Notifications for a specific store
 */
export async function subscribeToPushNotifications(storeId, token, forceNew = false) {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  if (!storeId) {
    throw new Error('Store ID is required to subscribe to notifications.');
  }

  // 1. Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(`Notification permission ${permission}. Please allow notifications in your browser settings.`);
  }

  // 2. Register / Get Service Worker
  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;

  // 3. Fetch VAPID public key from backend
  const keyRes = await fetch(`${API_BASE_URL}/api/notifications/vapid-key`);
  if (!keyRes.ok) {
    throw new Error('Failed to retrieve notification configuration from server.');
  }
  const { publicKey } = await keyRes.json();
  if (!publicKey) {
    throw new Error('Server returned empty VAPID key.');
  }

  // 4. Subscribe with PushManager
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  let subscription = await registration.pushManager.getSubscription();

  // If forceNew is requested (e.g. user clicked Enable Push Alerts to refresh stale key)
  if (forceNew && subscription) {
    try {
      await subscription.unsubscribe();
      subscription = null;
    } catch (subErr) {
      console.warn('Error resetting previous subscription:', subErr);
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
  }

  // 5. Send subscription to backend
  const subRes = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      storeId,
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent
    })
  });

  if (!subRes.ok) {
    const errData = await subRes.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to save push subscription on server.');
  }

  localStorage.setItem('gb_push_subscribed', 'true');
  return subscription;
}

/**
 * Unsubscribe from Push Notifications
 */
export async function unsubscribeFromPushNotifications(token) {
  if (!isPushNotificationSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch(`${API_BASE_URL}/api/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      }).catch(console.error);

      await subscription.unsubscribe();
    }

    localStorage.removeItem('gb_push_subscribed');
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
  }
}

/**
 * Send a test push notification to verify setup
 */
export async function triggerTestPushNotification(storeId, token) {
  const res = await fetch(`${API_BASE_URL}/api/notifications/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ storeId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to send test notification');
  }
  return await res.json();
}
