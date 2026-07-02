<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import ToastHost from '$lib/components/ToastHost.svelte';

	let { children } = $props();

	// Enregistre le service worker généré par @vite-pwa (installabilité + précache
	// de l'app shell). Import dynamique : le module virtuel n'existe qu'au build.
	onMount(() => {
		import('virtual:pwa-register')
			.then(({ registerSW }) => registerSW({ immediate: true }))
			.catch(() => {
				/* SW indisponible (dev / navigateur non compatible) — sans conséquence. */
			});
	});
</script>

{@render children()}
<ToastHost />
