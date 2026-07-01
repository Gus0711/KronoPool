<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import HoursGauge from '$lib/components/HoursGauge.svelte';
	import { ripple } from '$lib/actions/ripple';
	import { formatJour, formatDuree, formatAmplitude, formatHeure } from '$lib/format';
	import { aPause } from '$lib/heures';
	import { Download, Coffee } from 'lucide-svelte';
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

	<div class="card-lagon mb-4 py-6 text-center">
		<HoursGauge value={formatDuree(data.recap.total)} />
		<a
			href={exportHref}
			class="cta-sand mt-6 inline-flex items-center justify-center gap-2"
			data-sveltekit-reload
			use:ripple
		>
			<Download size={18} /> Exporter en CSV
		</a>
	</div>

	{#if data.recap.lignes.length === 0}
		<EmptyState illus="vagues" title="Aucun créneau sur cette période">
			Ajustez les dates ci-dessus pour élargir la recherche.
		</EmptyState>
	{:else}
		{#each data.recap.lignes as l, i (l.posteId)}
			<div
				class="card-lagon enter-rise mb-3 flex items-center justify-between"
				style="animation-delay:{Math.min(i * 40, 320)}ms"
			>
				<div class="min-w-0">
					<div class="font-display text-[15px] font-bold text-ink">{formatJour(l.date)}</div>
					<div class="mt-0.5 text-[13px] text-muted">{formatAmplitude(l.heureDebut, l.heureFin)}</div>
					{#if aPause(l.pauseDebut, l.pauseFin)}
						<div class="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-sand-dark">
							<Coffee size={12} class="shrink-0" /> Pause {formatHeure(l.pauseDebut!)}–{formatHeure(l.pauseFin!)}
						</div>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					<NiveauBadge niveau={l.niveauRequis} />
					<div class="text-right">
						<div class="font-display text-[15px] font-bold text-teal">{formatDuree(l.effectif)}</div>
						{#if aPause(l.pauseDebut, l.pauseFin)}
							<div class="text-[11px] text-muted">brut {formatDuree(l.amplitude)}</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>
