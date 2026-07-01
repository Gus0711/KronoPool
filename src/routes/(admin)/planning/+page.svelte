<script lang="ts">
	import BesoinRow from '$lib/components/BesoinRow.svelte';
	import WeekCalendar from '$lib/components/WeekCalendar.svelte';
	import { formatJour } from '$lib/format';
	import { CalendarRange, List, PlusCircle } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let vue = $state<'semaine' | 'liste'>('semaine');

	// Regroupement par jour pour la vue liste (à venir en premier puis passés).
	const parJour = $derived.by(() => {
		const map = new Map<string, typeof data.besoins>();
		for (const b of data.besoins) {
			const arr = map.get(b.date) ?? [];
			arr.push(b);
			map.set(b.date, arr);
		}
		return [...map.entries()];
	});
</script>

<svelte:head><title>Planning · KronoPool</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="font-display text-[24px] font-bold text-ink">Planning global</h1>
	<div class="flex flex-wrap items-center gap-3">
	<a href="/besoins/nouveau" class="cta-sand inline-flex w-auto items-center gap-2 px-4">
		<PlusCircle size={18} /> Nouveau besoin
	</a>
	<div class="inline-flex overflow-hidden rounded-cta border border-card-border bg-white">
		<button
			class="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold transition {vue === 'semaine' ? 'bg-teal text-white' : 'text-muted hover:bg-bg'}"
			onclick={() => (vue = 'semaine')}
		>
			<CalendarRange size={16} /> Semaine
		</button>
		<button
			class="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold transition {vue === 'liste' ? 'bg-teal text-white' : 'text-muted hover:bg-bg'}"
			onclick={() => (vue = 'liste')}
		>
			<List size={16} /> Liste
		</button>
	</div>
	</div>
</div>

{#if data.besoins.length === 0}
	<p class="text-[14px] text-muted">Aucun besoin enregistré.</p>
{:else if vue === 'semaine'}
	<WeekCalendar besoins={data.besoins} />
{:else}
	{#each parJour as [jour, liste] (jour)}
		<h2 class="mb-2 mt-5 font-display text-[14px] font-semibold text-teal first:mt-0">{formatJour(jour)}</h2>
		<div class="flex flex-col gap-3">
			{#each liste as b (b.id)}
				<BesoinRow besoin={b} href="/besoins/{b.id}" />
			{/each}
		</div>
	{/each}
{/if}
