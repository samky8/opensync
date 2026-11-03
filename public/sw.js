// No private pages, sessions, or business status responses are cached offline.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (
    event.request.mode === 'navigate' &&
    new URL(event.request.url).origin === self.location.origin
  )
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>OpenSync · Offline</title><body style="font:16px system-ui;padding:40px;color:#444"><h1>You’re offline.</h1><p>Reconnect to view current business hours or publish changes.</p><a href="/dashboard">Try again</a></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          ),
      ),
    );
});
