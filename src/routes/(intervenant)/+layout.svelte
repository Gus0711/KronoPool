<script lang="ts">
	import { page } from '$app/stores';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { FileWarning, X } from 'lucide-svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let dismiss = $state(false);
	const surCompte = $derived($page.url.pathname === '/compte');
	const afficherRappel = $derived(data.docsManquants > 0 && !dismiss && !surCompte);
</script>

<div class="app-water-bg mx-auto flex min-h-[100dvh] max-w-app flex-col">
	{#if afficherRappel}
		<div class="flex items-center gap-2 bg-warn-bg px-4 py-2 text-[13px] font-semibold text-warn">
			<FileWarning size={16} class="shrink-0" />
			<a href="/compte" class="flex-1 hover:underline">
				{data.docsManquants} document{data.docsManquants > 1 ? 's' : ''} obligatoire{data.docsManquants > 1 ? 's' : ''} à fournir
			</a>
			<button type="button" onclick={() => (dismiss = true)} aria-label="Masquer" class="shrink-0 opacity-70 hover:opacity-100">
				<X size={16} />
			</button>
		</div>
	{/if}
	<div class="flex flex-1 flex-col">{@render children()}</div>
	<BottomNav />
</div>
