// Galibrand Dashboard - Progressive Web App Service Worker
const SW_VERSION = 'v1.0.0';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately so the service worker controls active pages
  event.waitUntil(self.clients.claim());
});

// Push notification event listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data = {
        title: '🎉 New Live Order!',
        body: event.data.text() || 'A new order has been received on your store.',
      };
    }
  }

  const title = data.title || '🎉 New Live Order!';
  const options = {
    body: data.body || 'A new order has been received on your store.',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    tag: data.tag || 'live-order-' + Date.now(),
    renotify: true,
    requireInteraction: true, // Keep notification visible until user interacts with it
    vibrate: [250, 100, 250, 100, 250],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open_orders', title: '👀 View Live Orders' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this URL or origin
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If a window is open anywhere on this origin, navigate it to targetUrl and focus
      if (windowClients.length > 0 && 'focus' in windowClients[0] && 'navigate' in windowClients[0]) {
        return windowClients[0].navigate(targetUrl).then(client => client.focus());
      }
      // If no window is open (e.g. app/browser is closed), open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
