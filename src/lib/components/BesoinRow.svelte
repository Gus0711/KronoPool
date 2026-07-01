<script lang="ts">
	import { formatJour, formatPlage } from '$lib/format';
	import type { BesoinResume, StatutBesoin } from '$lib/server/services/besoins';

	let { besoin, href }: { besoin: BesoinResume; href?: string } = $props();

	const statutLabel: Record<StatutBesoin, string> = {
		avenir: 'À venir',
		complet: 'Complet',
		passe: 'Passé'
	};
	const statutClass: Record<StatutBesoin, string> = {
		avenir: 'bg-bnssa-bg text-teal',
		complet: 'bg-teal text-white',
		passe: 'bg-black/5 text-muted'
	};
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class="card-lagon flex items-center justify-between gap-3 {href ? 'transition hover:shadow-md' : ''}"
>
	<div class="min-w-0">
		<div class="font-display text-[15px] font-bold text-ink">
			{formatJour(besoin.date)}
		</div>
		<div class="text-[13px] text-muted">
			{formatPlage(besoin.heureDebut, besoin.heureFin)}
			{#if besoin.commentaire}· {besoin.commentaire}{/if}
		</div>
	</div>
	<div class="flex shrink-0 items-center gap-3">
		<div class="text-right">
			<div class="font-display text-[15px] font-bold text-ink">
				{besoin.pourvus}/{besoin.total}
			</div>
			<div class="text-[11px] text-muted">pourvus</div>
		</div>
		<span class="rounded-pill px-2.5 py-1 text-[11px] font-bold {statutClass[besoin.statut]}">
			{statutLabel[besoin.statut]}
		</span>
	</div>
</svelte:element>
