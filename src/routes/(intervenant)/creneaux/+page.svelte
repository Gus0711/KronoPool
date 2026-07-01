<script lang="ts">
	import { enhance } from '$app/forms';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CreneauCard from '$lib/components/CreneauCard.svelte';
	import { toasts } from '$lib/toast';
	import { formatJour } from '$lib/format';
	import type { Niveau } from '$lib/server/db/schema';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filtres seulement pour les niveaux visibles par l'utilisateur (handoff).
	const filtres = $derived<(Niveau | 'Tous')[]>(
		data.niveau === 'MNS' ? ['Tous', 'MNS', 'BNSSA'] : ['Tous', 'BNSSA']
	);
	let filtre = $state<Niveau | 'Tous'>('Tous');

	const visibles = $derived(
		filtre === 'Tous' ? data.creneaux : data.creneaux.filter((c) => c.niveauRequis === filtre)
	);

	// Regroupement par jour (l'ordre chronologique est déjà assuré côté serveur).
	const parJour = $derived.by(() => {
		const map = new Map<string, typeof data.creneaux>();
		for (const c of visibles) {
			const arr = map.get(c.date) ?? [];
			arr.push(c);
			map.set(c.date, arr);
		}
		return [...map.entries()];
	});
</script>

<svelte:head><title>Créneaux · KronoPool</title></svelte:head>

<AppHeader prenom={data.user.prenom} nom={data.user.nom} title="Créneaux à réserver">
	<div class="flex gap-2">
		{#each filtres as f (f)}
			<button
				type="button"
				class="chip {filtre === f ? 'chip-on' : 'chip-off'}"
				onclick={() => (filtre = f)}
			>
				{f}
			</button>
		{/each}
	</div>
</AppHeader>

<div class="flex-1 overflow-y-auto px-5 pb-6 pt-[6px]">
	{#if parJour.length === 0}
		<p class="mt-16 text-center text-[14px] text-muted">
			Aucun créneau disponible pour le moment.
		</p>
	{:else}
		{#each parJour as [jour, liste] (jour)}
			<div class="daylabel">{formatJour(jour)}</div>
			{#each liste as c (c.posteId)}
				<CreneauCard
					heureDebut={c.heureDebut}
					heureFin={c.heureFin}
					niveau={c.niveauRequis}
					commentaire={c.commentaire}
				>
					{#snippet action()}
						<form
							method="POST"
							action="?/reserver"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success' && result.data) {
										const d = result.data as { ok: boolean; message: string };
										if (d.ok) toasts.success(d.message);
										else toasts.error(d.message);
									}
									await update({ reset: false });
								};
							}}
						>
							<input type="hidden" name="posteId" value={c.posteId} />
							<button class="cta-sand mt-[14px]" type="submit">Réserver ce créneau</button>
						</form>
					{/snippet}
				</CreneauCard>
			{/each}
		{/each}
	{/if}
</div>
