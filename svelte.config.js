import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// Le service worker est géré par @vite-pwa (injectManifest + enregistrement
		// via virtual:pwa-register) ; on désactive l'auto-enregistrement de SvelteKit.
		serviceWorker: {
			register: false
		}
	}
};

export default config;
