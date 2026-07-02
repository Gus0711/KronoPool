<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, Repeat } from 'lucide-svelte';
	import { occurrencesHebdo, JOURS_SEMAINE, MAX_OCCURRENCES } from '$lib/recurrence';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);

	// État du formulaire (piloté pour l'aperçu du nombre d'occurrences).
	let jours = $state<number[]>([6]); // samedi par défaut
	let dateDebut = $state('');
	let dateFin = $state('');

	function toggleJour(v: number) {
		jours = jours.includes(v) ? jours.filter((j) => j !== v) : [...jours, v];
	}

	// Aperçu live du nombre d'occurrences (même logique que le serveur).
	const apercu = $derived(
		jours.length && dateDebut && dateFin
			? occurrencesHebdo(jours, dateDebut, dateFin)
			: []
	);
	const plafonnne = $derived(apercu.length >= MAX_OCCURRENCES);
</script>

<svelte:head><title>Besoin récurrent · KronoPool</title></svelte:head>

<a href="/besoins" class="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-teal">
	<ArrowLeft size={16} /> Retour aux besoins
</a>
<h1 class="mb-1 font-display text-[24px] font-bold text-ink">Besoin récurrent</h1>
<p class="mb-6 text-[14px] text-muted">
	Créez d'un coup tous les créneaux qui se répètent chaque semaine (ex. « tous les samedis
	9h-13h, 2 MNS »). Un besoin distinct est généré pour chaque date.
</p>

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
		<div class="flex flex-col gap-2">
			<span class="text-[13px] font-semibold text-ink">Jours de la semaine</span>
			<div class="flex flex-wrap gap-2">
				{#each JOURS_SEMAINE as j (j.valeur)}
					<label class="cursor-pointer">
						<input
							class="peer sr-only"
							type="checkbox"
							name="jours"
							value={j.valeur}
							checked={jours.includes(j.valeur)}
							onchange={() => toggleJour(j.valeur)}
						/>
						<span
							class="inline-flex items-center rounded-pill border border-card-border bg-white px-3 py-1.5 text-[13px] font-semibold text-muted peer-checked:border-teal peer-checked:bg-bnssa-bg peer-checked:text-teal"
						>
							{j.court}
						</span>
					</label>
				{/each}
			</div>
		</div>

		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">À partir du</span>
				<input class="field" type="date" name="dateDebut" bind:value={dateDebut} required />
			</label>
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Jusqu'au</span>
				<input class="field" type="date" name="dateFin" bind:value={dateFin} required />
			</label>
		</div>

		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Heure de début</span>
				<input class="field" type="time" name="heureDebut" value={(form?.values?.heureDebut as string) ?? ''} required />
			</label>
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Heure de fin</span>
				<input class="field" type="time" name="heureFin" value={(form?.values?.heureFin as string) ?? ''} required />
			</label>
		</div>

		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Pause début (optionnel)</span>
				<input class="field" type="time" name="pauseDebut" value={(form?.values?.pauseDebut as string) ?? ''} />
			</label>
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Pause fin (optionnel)</span>
				<input class="field" type="time" name="pauseFin" value={(form?.values?.pauseFin as string) ?? ''} />
			</label>
		</div>
		<p class="-mt-2 text-[12px] text-muted">
			Renseignez les deux (ou aucun) pour déduire la pause du temps de travail effectif.
		</p>

		<label class="flex flex-col gap-1">
			<span class="text-[13px] font-semibold text-ink">Commentaire (optionnel)</span>
			<input class="field" type="text" name="commentaire" value={(form?.values?.commentaire as string) ?? ''} placeholder="Ex : Bassin sportif · surveillance week-end" />
		</label>

		<div class="flex gap-3">
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Postes MNS</span>
				<input class="field" type="number" name="nbMns" min="0" max="50" value={(form?.values?.nbMns as string) ?? '0'} required />
			</label>
			<label class="flex flex-1 flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Postes BNSSA</span>
				<input class="field" type="number" name="nbBnssa" min="0" max="50" value={(form?.values?.nbBnssa as string) ?? '0'} required />
			</label>
		</div>

		<div class="rounded-cta border border-card-border bg-white px-3 py-2 text-[13px]">
			{#if apercu.length === 0}
				<span class="text-muted">Choisissez des jours et une période pour voir le nombre de créneaux.</span>
			{:else}
				<span class="font-semibold text-ink">{apercu.length} créneau(x)</span>
				<span class="text-muted"> seront créés (du {apercu[0]} au {apercu[apercu.length - 1]}).</span>
				{#if plafonnne}
					<span class="text-sand-dark"> Plafond de {MAX_OCCURRENCES} atteint — réduisez la période pour tout couvrir.</span>
				{/if}
			{/if}
		</div>

		<button class="cta-sand inline-flex items-center justify-center gap-2" type="submit" disabled={loading}>
			<Repeat size={18} /> {loading ? 'Création…' : `Créer ${apercu.length || ''} besoin(s)`}
		</button>
	</form>
</div>
