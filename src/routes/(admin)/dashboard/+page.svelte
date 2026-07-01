<script lang="ts">
	import BesoinRow from '$lib/components/BesoinRow.svelte';
	import ValiditePill from '$lib/components/ValiditePill.svelte';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import { CalendarClock, AlertTriangle, PlusCircle } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Tableau de bord · KronoPool</title></svelte:head>

<div class="mb-6 flex items-center justify-between">
	<h1 class="font-display text-[24px] font-bold text-ink">Tableau de bord</h1>
	<a href="/besoins/nouveau" class="cta-sand inline-flex w-auto items-center gap-2 px-4">
		<PlusCircle size={18} /> Nouveau besoin
	</a>
</div>

<!-- KPIs -->
<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
	<div class="card-lagon">
		<div class="text-[13px] text-muted">Besoins à venir</div>
		<div class="mt-1 font-display text-[32px] font-bold text-teal">{data.nbBesoinsAVenir}</div>
	</div>
	<div class="card-lagon">
		<div class="text-[13px] text-muted">Postes non pourvus</div>
		<div class="mt-1 font-display text-[32px] font-bold {data.postesNonPourvus > 0 ? 'text-sand-dark' : 'text-teal'}">
			{data.postesNonPourvus}
		</div>
	</div>
	<div class="card-lagon">
		<div class="text-[13px] text-muted">Alertes diplômes</div>
		<div class="mt-1 font-display text-[32px] font-bold {data.alertes.length > 0 ? 'text-danger' : 'text-teal'}">
			{data.alertes.length}
		</div>
	</div>
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	<!-- Prochains besoins -->
	<section>
		<h2 class="mb-3 flex items-center gap-2 font-display text-[16px] font-bold text-ink">
			<CalendarClock size={18} class="text-teal" /> Prochains besoins
		</h2>
		{#if data.prochains.length === 0}
			<p class="text-[14px] text-muted">Aucun besoin à venir.</p>
		{:else}
			<div class="flex flex-col gap-3">
				{#each data.prochains as b (b.id)}
					<BesoinRow besoin={b} href="/besoins/{b.id}" />
				{/each}
			</div>
		{/if}
	</section>

	<!-- Alertes diplômes -->
	<section>
		<h2 class="mb-3 flex items-center gap-2 font-display text-[16px] font-bold text-ink">
			<AlertTriangle size={18} class="text-danger" /> Alertes diplômes
		</h2>
		{#if data.alertes.length === 0}
			<p class="text-[14px] text-muted">Aucune alerte — tous les diplômes sont à jour.</p>
		{:else}
			<div class="flex flex-col gap-3">
				{#each data.alertes as i (i.id)}
					<a href="/intervenants/{i.id}" class="card-lagon block transition hover:shadow-md">
						<div class="mb-2 flex items-center justify-between">
							<span class="font-display text-[15px] font-bold text-ink">{i.prenom} {i.nom}</span>
							{#if i.niveau}<NiveauBadge niveau={i.niveau} />{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							<ValiditePill date={i.dateValiditeTitre} statut={i.titre.statut} joursRestants={i.titre.joursRestants} />
							<ValiditePill date={i.dateValiditePse} statut={i.pse.statut} joursRestants={i.pse.joursRestants} />
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</div>
