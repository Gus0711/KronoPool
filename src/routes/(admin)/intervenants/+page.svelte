<script lang="ts">
	import { enhance } from '$app/forms';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import ValiditePill from '$lib/components/ValiditePill.svelte';
	import { toasts } from '$lib/toast';
	import { UserPlus } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showForm = $state(false);
	let loading = $state(false);
	const v = (k: string) => (form?.values?.[k] as string) ?? '';

	$effect(() => {
		if (form?.ok) {
			toasts.success('Intervenant créé ✓');
			showForm = false;
		}
	});
</script>

<svelte:head><title>Intervenants · KronoPool</title></svelte:head>

<div class="mb-6 flex items-center justify-between">
	<h1 class="font-display text-[24px] font-bold text-ink">Intervenants</h1>
	<button class="cta-sand inline-flex w-auto items-center gap-2 px-4" onclick={() => (showForm = !showForm)}>
		<UserPlus size={18} /> Nouvel intervenant
	</button>
</div>

{#if showForm}
	<div class="card-lagon mb-6 max-w-2xl">
		<h2 class="mb-3 font-display text-[15px] font-bold text-ink">Créer un intervenant</h2>
		{#if form?.error}
			<div class="mb-3 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{form.error}</div>
		{/if}
		<form
			method="POST"
			action="?/creer"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="grid grid-cols-1 gap-3 sm:grid-cols-2"
		>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Prénom</span>
				<input class="field" name="prenom" value={v('prenom')} required />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Nom</span>
				<input class="field" name="nom" value={v('nom')} required />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Email</span>
				<input class="field" type="email" name="email" value={v('email')} required />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Téléphone</span>
				<input class="field" name="telephone" value={v('telephone')} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Niveau</span>
				<select class="field" name="niveau" value={v('niveau') || 'BNSSA'} required>
					<option value="BNSSA">BNSSA</option>
					<option value="MNS">MNS</option>
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Mot de passe initial</span>
				<input class="field" name="motDePasse" minlength="8" required />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Validité titre</span>
				<input class="field" type="date" name="dateValiditeTitre" value={v('dateValiditeTitre')} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Validité PSE1</span>
				<input class="field" type="date" name="dateValiditePse" value={v('dateValiditePse')} />
			</label>
			<div class="sm:col-span-2">
				<button class="cta-sand" type="submit" disabled={loading}>
					{loading ? 'Création…' : "Créer l'intervenant"}
				</button>
				<p class="mt-2 text-[12px] text-muted">
					Le mot de passe devra être changé à la première connexion.
				</p>
			</div>
		</form>
	</div>
{/if}

{#if data.intervenants.length === 0}
	<p class="text-[14px] text-muted">Aucun intervenant pour le moment.</p>
{:else}
	<div class="flex flex-col gap-3">
		{#each data.intervenants as i (i.id)}
			<a href="/intervenants/{i.id}" class="card-lagon block transition hover:shadow-md">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex items-center gap-3">
						<span class="font-display text-[15px] font-bold text-ink">{i.prenom} {i.nom}</span>
						{#if i.niveau}<NiveauBadge niveau={i.niveau} />{/if}
						{#if !i.actif}
							<span class="rounded-pill bg-black/5 px-2.5 py-1 text-[11px] font-bold text-muted">Inactif</span>
						{/if}
					</div>
					<span class="text-[13px] text-muted">{i.email}</span>
				</div>
				<div class="mt-2 flex flex-wrap gap-2">
					<ValiditePill date={i.dateValiditeTitre} statut={i.titre.statut} joursRestants={i.titre.joursRestants} />
					<ValiditePill date={i.dateValiditePse} statut={i.pse.statut} joursRestants={i.pse.joursRestants} />
				</div>
			</a>
		{/each}
	</div>
{/if}
