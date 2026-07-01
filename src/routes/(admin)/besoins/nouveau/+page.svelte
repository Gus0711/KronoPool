<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let loading = $state(false);
	// Valeur d'un champ : priorité aux valeurs re-soumises (après erreur), sinon
	// pré-remplissage issu du planning (paramètres d'URL).
	const v = (k: string) =>
		(form?.values?.[k] as string) ?? (data.defaults[k as keyof typeof data.defaults] ?? '');
</script>

<svelte:head><title>Nouveau besoin · KronoPool</title></svelte:head>

<a href="/besoins" class="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-teal">
	<ArrowLeft size={16} /> Retour aux besoins
</a>
<h1 class="mb-6 font-display text-[24px] font-bold text-ink">Créer un besoin</h1>

<div class="max-w-xl">
	{#if form?.error}
		<div class="mb-4 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" role="alert">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
		class="card-lagon flex flex-col gap-4"
	>
		<label class="flex flex-col gap-1">
			<span class="text-[13px] font-semibold text-ink">Date</span>
			<input class="field" type="date" name="date" value={v('date')} required />
		</label>
		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Heure de début</span>
				<input class="field" type="time" name="heureDebut" value={v('heureDebut')} required />
			</label>
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Heure de fin</span>
				<input class="field" type="time" name="heureFin" value={v('heureFin')} required />
			</label>
		</div>
		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Pause début (optionnel)</span>
				<input class="field" type="time" name="pauseDebut" value={v('pauseDebut')} />
			</label>
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Pause fin (optionnel)</span>
				<input class="field" type="time" name="pauseFin" value={v('pauseFin')} />
			</label>
		</div>
		<p class="-mt-2 text-[12px] text-muted">
			Renseignez les deux (ou aucun) pour déduire la pause du temps de travail effectif.
		</p>
		<label class="flex flex-col gap-1">
			<span class="text-[13px] font-semibold text-ink">Commentaire (optionnel)</span>
			<input class="field" type="text" name="commentaire" value={v('commentaire')} placeholder="Ex : Bassin sportif · renfort matin" />
		</label>
		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Postes MNS</span>
				<input class="field" type="number" name="nbMns" min="0" max="50" value={v('nbMns') || '0'} required />
			</label>
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Postes BNSSA</span>
				<input class="field" type="number" name="nbBnssa" min="0" max="50" value={v('nbBnssa') || '0'} required />
			</label>
		</div>
		<p class="text-[12px] text-muted">
			Un poste sera généré pour chaque MNS et chaque BNSSA saisi (ex : 1 MNS + 2 BNSSA = 3 postes).
		</p>
		<button class="cta-sand" type="submit" disabled={loading}>
			{loading ? 'Création…' : 'Créer le besoin'}
		</button>
	</form>
</div>
