import { defineConfig } from 'vitest/config';

// Tests unitaires des règles métier pures (sans SvelteKit / DB).
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
