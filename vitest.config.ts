import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Tests unitaires des règles métier pures (sans SvelteKit / DB).
export default defineConfig({
	resolve: {
		// Résout l'alias `$lib` de SvelteKit dans les tests (ex. format.ts → $lib/heures).
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
