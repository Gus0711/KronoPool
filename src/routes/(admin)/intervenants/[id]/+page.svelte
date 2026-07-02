<script lang="ts">
	import { enhance } from '$app/forms';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import DocumentsSection from '$lib/components/DocumentsSection.svelte';
	import { toasts } from '$lib/toast';
	import { ArrowLeft, Power, KeyRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const i = $derived(data.intervenant);

	$effect(() => {
		if (form?.action === 'modifier' && form.ok) toasts.success('Modifications enregistrées ✓');
		if (form?.action === 'actif') toasts.success(form.actif ? 'Compte activé ✓' : 'Compte désactivé');
		if (form?.action === 'reset' && form.ok) toasts.success('Mot de passe réinitialisé ✓');
	});
</script>

<svelte:head><title>{i.prenom} {i.nom} · KronoPool</title></svelte:head>

<a href="/intervenants" class="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-teal">
	<ArrowLeft size={16} /> Retour aux intervenants
</a>

<div class="mb-6 flex flex-wrap items-center gap-3">
	<h1 class="font-display text-[24px] font-bold text-ink">{i.prenom} {i.nom}</h1>
	{#if i.niveau}<NiveauBadge niveau={i.niveau} />{/if}
	{#if !i.actif}<span class="rounded-pill bg-black/5 px-2.5 py-1 text-[11px] font-bold text-muted">Inactif</span>{/if}
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	<!-- Édition -->
	<div class="card-lagon">
		<h2 class="mb-3 font-display text-[15px] font-bold text-ink">Informations</h2>
		{#if form?.action === 'modifier' && form?.error}
			<div class="mb-3 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{form.error}</div>
		{/if}
		<form method="POST" action="?/modifier" use:enhance class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Prénom</span>
				<input class="field" name="prenom" value={i.prenom} required />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Nom</span>
				<input class="field" name="nom" value={i.nom} required />
			</label>
			<label class="flex flex-col gap-1 sm:col-span-2">
				<span class="text-[13px] font-semibold text-ink">Email</span>
				<input class="field" type="email" name="email" value={i.email} required />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Téléphone</span>
				<input class="field" name="telephone" value={i.telephone ?? ''} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Niveau</span>
				<select class="field" name="niveau" value={i.niveau ?? 'BNSSA'} required>
					<option value="BNSSA">BNSSA</option>
					<option value="MNS">MNS</option>
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Validité titre</span>
				<input class="field" type="date" name="dateValiditeTitre" value={i.dateValiditeTitre ?? ''} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Validité PSE1</span>
				<input class="field" type="date" name="dateValiditePse" value={i.dateValiditePse ?? ''} />
			</label>
			<div class="sm:col-span-2">
				<button class="cta-sand" type="submit">Enregistrer</button>
			</div>
		</form>
	</div>

	<div class="flex flex-col gap-6">
		<!-- Activation -->
		<div class="card-lagon">
			<h2 class="mb-2 font-display text-[15px] font-bold text-ink">Statut du compte</h2>
			<p class="mb-3 text-[13px] text-muted">
				{i.actif
					? 'Le compte est actif. Le désactiver empêche la connexion et invalide les sessions.'
					: 'Le compte est désactivé (connexion impossible).'}
			</p>
			<form method="POST" action="?/actif" use:enhance>
				<input type="hidden" name="actif" value={i.actif ? 'false' : 'true'} />
				<button class="inline-flex items-center gap-1.5 rounded-cta border px-3 py-2 text-[13px] font-semibold {i.actif ? 'border-danger/30 bg-danger-bg text-danger' : 'border-teal/30 bg-bnssa-bg text-teal'}" type="submit">
					<Power size={16} /> {i.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
				</button>
			</form>
		</div>

		<!-- Reset password -->
		<div class="card-lagon">
			<h2 class="mb-2 font-display text-[15px] font-bold text-ink">Réinitialiser le mot de passe</h2>
			{#if form?.action === 'reset' && form?.error}
				<div class="mb-3 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{form.error}</div>
			{/if}
			<p class="mb-3 text-[13px] text-muted">
				Définit un nouveau mot de passe initial ; il devra être changé à la prochaine connexion. Les sessions en cours sont invalidées.
			</p>
			<form method="POST" action="?/reset" use:enhance class="flex gap-2">
				<input class="field" name="motDePasse" placeholder="Nouveau mot de passe" minlength="8" required />
				<button class="inline-flex shrink-0 items-center gap-1.5 rounded-cta bg-teal px-3 py-2 text-[13px] font-semibold text-white" type="submit">
					<KeyRound size={16} /> Réinitialiser
				</button>
			</form>
		</div>
	</div>
</div>

<!-- Documents de l'intervenant -->
<div class="mt-6">
	<DocumentsSection
		documents={data.documents}
		types={data.typesDocuments}
		conformite={data.conformite}
		titre="Documents"
		soustitre="Pièces justificatives de l'intervenant (carte d'identité, diplômes, PSE1…)."
	/>
</div>
