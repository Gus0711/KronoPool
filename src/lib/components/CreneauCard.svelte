<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Niveau } from '$lib/server/db/schema';
	import { formatPlage, formatEffectif } from '$lib/format';
	import { aPause } from '$lib/heures';
	import { Coffee } from 'lucide-svelte';
	import NiveauBadge from './NiveauBadge.svelte';

	let {
		heureDebut,
		heureFin,
		niveau,
		pauseDebut = null,
		pauseFin = null,
		commentaire = null,
		muted = false,
		delay = 0,
		action
	}: {
		heureDebut: string;
		heureFin: string;
		niveau: Niveau;
		pauseDebut?: string | null;
		pauseFin?: string | null;
		commentaire?: string | null;
		muted?: boolean;
		delay?: number;
		action?: Snippet;
	} = $props();

	const effectif = $derived(formatEffectif(heureDebut, heureFin, pauseDebut, pauseFin));
	const avecPause = $derived(aPause(pauseDebut, pauseFin));
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
			<div class="mt-[3px] flex items-center gap-1.5 pl-[14px] text-[12.5px] font-medium {avecPause ? 'text-sand-dark' : 'text-muted'}">
				{#if avecPause}<Coffee size={13} class="shrink-0" />{/if}
				{effectif}
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
