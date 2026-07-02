/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

// Service worker KronoPool (stratégie injectManifest).
// - Précache minimal de l'app shell (injecté au build via self.__WB_MANIFEST).
// - Gère les notifications push (Web Push) + le clic sur notification.
//   Aucune logique d'abonnement ici : la souscription se fait côté page.

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);

interface PushPayload {
	title?: string;
	body?: string;
	url?: string;
	tag?: string;
}

self.addEventListener('push', (event) => {
	let data: PushPayload = {};
	try {
		data = event.data?.json() ?? {};
	} catch {
		data = { body: event.data?.text() };
	}

	const title = data.title ?? 'KronoPool';
	const options: NotificationOptions = {
		body: data.body ?? '',
		icon: '/pwa-192x192.png',
		badge: '/pwa-192x192.png',
		tag: data.tag,
		data: { url: data.url ?? '/' }
	};
	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const cible = (event.notification.data as { url?: string } | undefined)?.url ?? '/';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			// Réutilise une fenêtre existante si possible, sinon en ouvre une.
			for (const client of clients) {
				const win = client as WindowClient;
				if ('focus' in win) {
					win.navigate?.(cible);
					return win.focus();
				}
			}
			return self.clients.openWindow(cible);
		})
	);
});

// Activation immédiate de la nouvelle version (cohérent avec registerType autoUpdate).
self.addEventListener('install', () => {
	self.skipWaiting();
});
self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});
