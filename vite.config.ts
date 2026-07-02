import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			// SW écrit à la main (src/service-worker.ts) : nécessaire pour gérer le push.
			strategies: 'injectManifest',
			// Mise à jour transparente du SW (le shell se rafraîchit au prochain chargement).
			registerType: 'autoUpdate',
			// On enregistre le SW manuellement dans le layout racine (onMount).
			injectRegister: null,
			manifest: {
				name: 'KronoPool',
				short_name: 'KronoPool',
				description: 'Gestion des plannings de surveillance de piscine.',
				lang: 'fr',
				dir: 'ltr',
				theme_color: '#155e75',
				background_color: '#eaf3f5',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				scope: '/',
				icons: [
					{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
					{
						src: '/pwa-maskable-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			injectManifest: {
				// Précache minimal de l'app shell (assets client build). Pas de mise en cache
				// des navigations/pages (SSR + auth) → pas de fallback offline pour l'instant.
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
			},
			// Le SW de dev peut gêner le HMR : on teste l'installabilité via `build` + `preview`.
			devOptions: {
				enabled: false
			}
		})
	]
});
