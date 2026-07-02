<script lang="ts">
	import { formatJour, formatPlage } from '$lib/format';
	import type { BesoinResume, StatutBesoin } from '$lib/server/services/besoins';

	let { besoin, href }: { besoin: BesoinResume; href?: string } = $props();

	const statutLabel: Record<StatutBesoin, string> = {
		avenir: 'À venir',
		complet: 'Complet',
		passe: 'Passé'
	};
	// Feu tricolore : à pourvoir (ambre) · complet (vert) · passé (gris).
	const statutClass: Record<StatutBesoin, string> = {
		avenir: 'bg-warn-bg text-warn',
		complet: 'bg-success-bg text-success',
		passe: 'bg-black/5 text-muted'
	};

	const pct = $derived(besoin.total > 0 ? Math.round((besoin.pourvus / besoin.total) * 100) : 0);
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class="card-lagon block {href ? 'transition hover:shadow-lg' : ''}"
>
	<div class="flex items-center justify-between gap-3">
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
	</div>

	<!-- Niveau d'eau : remplissage des postes -->
	<div class="mt-3 h-2 overflow-hidden rounded-pill bg-bnssa-bg">
		<div
			class="fill h-full rounded-pill"
			class:complet={pct >= 100}
			style="width:{pct}%"
		></div>
	</div>
</svelte:element>

<style>
	.fill {
		background: linear-gradient(90deg, #1d7d9c, #155e75);
		transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.complet {
		background: linear-gradient(90deg, #155e75, #0c4a5e);
	}
	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
	}
</style>
