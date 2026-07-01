<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Niveau } from '$lib/server/db/schema';
	import { formatPlage } from '$lib/format';
	import NiveauBadge from './NiveauBadge.svelte';

	let {
		heureDebut,
		heureFin,
		niveau,
		commentaire = null,
		muted = false,
		action
	}: {
		heureDebut: string;
		heureFin: string;
		niveau: Niveau;
		commentaire?: string | null;
		muted?: boolean;
		action?: Snippet;
	} = $props();
</script>

<div class="card-lagon {muted ? 'opacity-70' : ''}">
	<div class="flex items-start justify-between gap-3">
		<div>
			<div class="font-display text-[19px] font-bold text-ink">
				{formatPlage(heureDebut, heureFin)}
			</div>
			{#if commentaire}
				<div class="mt-[3px] text-[13px] text-muted">{commentaire}</div>
			{/if}
		</div>
		<NiveauBadge {niveau} />
	</div>
	{#if action}
		{@render action()}
	{/if}
</div>
