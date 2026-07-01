<script lang="ts">
	import { formatDuree } from '$lib/format';
	import { Download } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const exportHref = $derived(`/recap/export?from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}`);
</script>

<svelte:head><title>Récap d'heures · KronoPool</title></svelte:head>

<h1 class="mb-6 font-display text-[24px] font-bold text-ink">Récap d'heures</h1>

<form method="GET" class="mb-6 flex flex-wrap items-end gap-3">
	<label class="flex flex-col gap-1">
		<span class="text-[12px] font-semibold text-muted">Du</span>
		<input class="field" type="date" name="from" value={data.from} />
	</label>
	<label class="flex flex-col gap-1">
		<span class="text-[12px] font-semibold text-muted">Au</span>
		<input class="field" type="date" name="to" value={data.to} />
	</label>
	<button class="rounded-cta bg-teal px-4 py-3 text-[14px] font-bold text-white" type="submit">Filtrer</button>
	<a href={exportHref} data-sveltekit-reload class="cta-sand inline-flex w-auto items-center gap-2 px-4">
		<Download size={18} /> Exporter en CSV
	</a>
</form>

<div class="card-lagon mb-4 flex items-center justify-between">
	<span class="text-[14px] font-semibold text-muted">Total global sur la période</span>
	<span class="font-display text-[24px] font-bold text-teal">{formatDuree(data.totalGlobal)}</span>
</div>

{#if data.lignes.length === 0}
	<p class="text-[14px] text-muted">Aucune heure enregistrée sur cette période.</p>
{:else}
	<div class="overflow-hidden rounded-card border border-card-border bg-white">
		<table class="w-full text-left text-[14px]">
			<thead class="bg-bg text-[12px] uppercase tracking-wide text-muted">
				<tr>
					<th class="px-4 py-3">Intervenant</th>
					<th class="px-4 py-3">Niveau</th>
					<th class="px-4 py-3 text-right">Créneaux</th>
					<th class="px-4 py-3 text-right">Heures</th>
				</tr>
			</thead>
			<tbody>
				{#each data.lignes as l (l.intervenantId)}
					<tr class="border-t border-card-border">
						<td class="px-4 py-3 font-semibold text-ink">{l.prenom} {l.nom}</td>
						<td class="px-4 py-3 text-muted">{l.niveau ?? '—'}</td>
						<td class="px-4 py-3 text-right text-muted">{l.nbCreneaux}</td>
						<td class="px-4 py-3 text-right font-display font-bold text-teal">{formatDuree(l.totalHeures)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
