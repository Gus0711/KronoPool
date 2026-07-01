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
		delay = 0,
		action
	}: {
		heureDebut: string;
		heureFin: string;
		niveau: Niveau;
		commentaire?: string | null;
		muted?: boolean;
		delay?: number;
		action?: Snippet;
	} = $props();
</script>

<div
	class="card-lagon enter-rise mb-3 transition-shadow duration-200 hover:shadow-lg {muted
		? 'opacity-70'
		: ''}"
	style="animation-delay:{delay}ms"
>
	<div class="flex items-start justify-between gap-3">
		<div>
			<div class="flex items-center gap-1.5 font-display text-[19px] font-bold text-ink">
				<span class="h-2 w-2 shrink-0 rounded-full bg-teal/70"></span>
				{formatPlage(heureDebut, heureFin)}
			</div>
			{#if commentaire}
				<div class="mt-[3px] pl-[14px] text-[13px] text-muted">{commentaire}</div>
			{/if}
		</div>
		<NiveauBadge {niveau} />
	</div>
	{#if action}
		{@render action()}
	{/if}
</div>
