<script lang="ts">
	import BesoinRow from '$lib/components/BesoinRow.svelte';
	import { PlusCircle, Repeat } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let onglet = $state<'avenir' | 'passes'>('avenir');
	const liste = $derived(onglet === 'avenir' ? data.aVenir : data.passes);
</script>

<svelte:head><title>Besoins · KronoPool</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="font-display text-[24px] font-bold text-ink">Besoins</h1>
	<div class="flex flex-wrap gap-2">
		<a href="/besoins/recurrent" class="inline-flex w-auto items-center gap-2 rounded-cta border border-card-border bg-white px-4 py-2.5 text-[14px] font-semibold text-teal">
			<Repeat size={18} /> Besoin récurrent
		</a>
		<a href="/besoins/nouveau" class="cta-sand inline-flex w-auto items-center gap-2 px-4">
			<PlusCircle size={18} /> Nouveau besoin
		</a>
	</div>
</div>

{#if data.serieCreees}
	<div class="mb-4 rounded-cta border border-teal/20 bg-bnssa-bg px-3 py-2 text-[13px] font-medium text-teal" role="status">
		{data.serieCreees} créneau(x) récurrent(s) créé(s) ✓
	</div>
{/if}
{#if data.serieSupprimes !== null}
	<div class="mb-4 rounded-cta border border-teal/20 bg-bnssa-bg px-3 py-2 text-[13px] font-medium text-teal" role="status">
		Série : {data.serieSupprimes} occurrence(s) future(s) supprimée(s){#if data.serieConserves}, {data.serieConserves} conservée(s) (réservées ou passées){/if}.
	</div>
{/if}

<div class="mb-4 flex gap-2">
	<button class="chip {onglet === 'avenir' ? 'chip-on' : 'bg-black/5 text-muted'}" onclick={() => (onglet = 'avenir')}>
		À venir ({data.aVenir.length})
	</button>
	<button class="chip {onglet === 'passes' ? 'chip-on' : 'bg-black/5 text-muted'}" onclick={() => (onglet = 'passes')}>
		Passés ({data.passes.length})
	</button>
</div>

{#if liste.length === 0}
	<p class="text-[14px] text-muted">Aucun besoin {onglet === 'avenir' ? 'à venir' : 'passé'}.</p>
{:else}
	<div class="flex flex-col gap-3">
		{#each liste as b (b.id)}
			<BesoinRow besoin={b} href="/besoins/{b.id}" />
		{/each}
	</div>
{/if}
