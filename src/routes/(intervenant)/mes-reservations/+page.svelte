<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CreneauCard from '$lib/components/CreneauCard.svelte';
	import { formatJour } from '$lib/format';
	import { Phone } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let onglet = $state<'avenir' | 'passees'>('avenir');

	const liste = $derived(
		onglet === 'avenir' ? data.reservations.aVenir : data.reservations.passees
	);
	const telHref = $derived(data.directeurTel.replace(/\s+/g, ''));
</script>

<svelte:head><title>Mes réservations · KronoPool</title></svelte:head>

<AppHeader prenom={data.user.prenom} nom={data.user.nom} title="Mes réservations">
	<div class="flex gap-2">
		<button
			type="button"
			class="chip {onglet === 'avenir' ? 'chip-on' : 'chip-off'}"
			onclick={() => (onglet = 'avenir')}>À venir</button
		>
		<button
			type="button"
			class="chip {onglet === 'passees' ? 'chip-on' : 'chip-off'}"
			onclick={() => (onglet = 'passees')}>Passées</button
		>
	</div>
</AppHeader>

<div class="flex-1 overflow-y-auto px-5 pb-6 pt-4">
	{#if onglet === 'avenir'}
		<div class="mb-4 flex items-start gap-2 rounded-cta border border-sand/40 bg-warn-bg px-3 py-3 text-[13px] text-sand-ink">
			<Phone size={18} class="mt-px shrink-0" />
			<div>
				Pour annuler une réservation, contactez le directeur par téléphone :
				{#if data.directeurTel}
					<a class="font-bold underline" href="tel:{telHref}">{data.directeurTel}</a>.
				{/if}
			</div>
		</div>
	{/if}

	{#if liste.length === 0}
		<p class="mt-16 text-center text-[14px] text-muted">
			{onglet === 'avenir' ? 'Aucune réservation à venir.' : 'Aucune réservation passée.'}
		</p>
	{:else}
		{#each liste as r (r.posteId)}
			<div class="daylabel">{formatJour(r.date)}</div>
			<CreneauCard
				heureDebut={r.heureDebut}
				heureFin={r.heureFin}
				niveau={r.niveauRequis}
				commentaire={r.commentaire}
				muted={onglet === 'passees'}
			>
				{#snippet action()}
					<div class="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-teal">
						<span class="h-1.5 w-1.5 rounded-full bg-teal"></span>Confirmé
					</div>
				{/snippet}
			</CreneauCard>
		{/each}
	{/if}
</div>
