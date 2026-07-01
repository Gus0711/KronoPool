<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import { formatJour, formatDuree } from '$lib/format';
	import { Download } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const exportHref = $derived(
		`/mon-recap/export?from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}`
	);
</script>

<svelte:head><title>Mon récap · KronoPool</title></svelte:head>

<AppHeader prenom={data.user.prenom} nom={data.user.nom} title="Mon récap" />

<div class="flex-1 overflow-y-auto px-5 pb-6 pt-4">
	<form method="GET" class="mb-4 flex items-end gap-2">
		<label class="flex flex-1 flex-col gap-1">
			<span class="text-[12px] font-semibold text-muted">Du</span>
			<input class="field" type="date" name="from" value={data.from} />
		</label>
		<label class="flex flex-1 flex-col gap-1">
			<span class="text-[12px] font-semibold text-muted">Au</span>
			<input class="field" type="date" name="to" value={data.to} />
		</label>
		<button class="rounded-cta bg-teal px-4 py-3 text-[14px] font-bold text-white" type="submit">
			OK
		</button>
	</form>

	<div class="card-lagon mb-4 text-center">
		<div class="text-[13px] font-medium text-muted">Total sur la période</div>
		<div class="mt-1 font-display text-[40px] font-bold leading-none text-teal">
			{formatDuree(data.recap.total)}
		</div>
		<a href={exportHref} class="cta-sand mt-4 inline-flex items-center justify-center gap-2" data-sveltekit-reload>
			<Download size={18} /> Exporter en CSV
		</a>
	</div>

	{#if data.recap.lignes.length === 0}
		<p class="mt-10 text-center text-[14px] text-muted">Aucun créneau sur cette période.</p>
	{:else}
		{#each data.recap.lignes as l (l.posteId)}
			<div class="card-lagon mb-3 flex items-center justify-between">
				<div>
					<div class="font-display text-[15px] font-bold text-ink">{formatJour(l.date)}</div>
					<div class="mt-0.5 text-[13px] text-muted">{l.heureDebut} – {l.heureFin}</div>
				</div>
				<div class="flex items-center gap-3">
					<NiveauBadge niveau={l.niveauRequis} />
					<span class="font-display text-[15px] font-bold text-teal">{formatDuree(l.dureeHeures)}</span>
				</div>
			</div>
		{/each}
	{/if}
</div>
