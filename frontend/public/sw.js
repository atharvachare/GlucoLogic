self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body } = event.data;
    
    // NOTE: In a real production environment, we would use a Push Server.
    // This local timer only works if the browser process is still alive.
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/GlucoLogic_icon Background Removed.png',
        badge: '/GlucoLogic_icon Background Removed.png',
        vibrate: [200, 100, 200]
      });
    }, delay);
  }
});

// Handle push events from server (Firebase FCM)
self.addEventListener('push', (event) => {
  let data = { title: 'Insulin Learner', body: 'Time to check your sugar!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/GlucoLogic_icon Background Removed.png',
    badge: '/GlucoLogic_icon Background Removed.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
