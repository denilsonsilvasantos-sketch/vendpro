/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/vanillajs" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any[] };

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data.json();
  } catch {
    data = { body: event.data.text() };
  }

  const title = data.title || 'Novo Pedido!';
  const options: NotificationOptions = {
    body: data.body || 'Você recebeu um novo pedido.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'new-order',
    renotify: true,
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find(c => c.url === url || c.url.startsWith(self.location.origin));
      if (existing) {
        existing.focus();
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});
