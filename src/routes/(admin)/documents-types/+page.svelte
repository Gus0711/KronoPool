<script lang="ts">
	import { enhance } from '$app/forms';
	import { toasts } from '$lib/toast';
	import { FileCog, Plus, Check, EyeOff, Eye } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showCreate = $state(false);
	let editId = $state<string | null>(null);

	$effect(() => {
		if (form?.ok) {
			if (form.action === 'creer') {
				toasts.success('Type créé ✓');
				showCreate = false;
			} else if (form.action === 'modifier') {
				toasts.success('Type modifié ✓');
				editId = null;
			} else if (form.action === 'activer') {
				toasts.success(form.actif ? 'Type réactivé ✓' : 'Type désactivé');
			}
		}
	});
</script>

<svelte:head><title>Types de documents · KronoPool</title></svelte:head>

<div class="mb-6 flex items-center justify-between gap-3">
	<h1 class="flex items-center gap-2 font-display text-[24px] font-bold text-ink">
		<FileCog size={24} /> Types de documents
	</h1>
	<button class="cta-sand inline-flex w-auto items-center gap-2 px-4" onclick={() => (showCreate = !showCreate)}>
		<Plus size={18} /> Nouveau type
	</button>
</div>

<p class="mb-4 max-w-2xl text-[13.5px] text-muted">
	Définissez les catégories de documents que les intervenants peuvent fournir. Les types
	<strong>obligatoires</strong> génèrent une alerte de conformité tant qu'ils ne sont pas fournis (ou expirés).
	Un niveau restreint l'obligation aux intervenants de ce niveau.
</p>

{#if showCreate}
	<div class="card-lagon mb-6 max-w-2xl">
		<h2 class="mb-3 font-display text-[15px] font-bold text-ink">Créer un type</h2>
		{#if form?.action === 'creer' && form?.error}
			<div class="mb-3 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{form.error}</div>
		{/if}
		<form method="POST" action="?/creer" use:enhance class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<label class="flex flex-col gap-1 sm:col-span-2">
				<span class="text-[13px] font-semibold text-ink">Libellé</span>
				<input class="field" name="libelle" placeholder="Carte d'identité" required />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Niveau concerné</span>
				<select class="field" name="niveauRequis">
					<option value="">Tous</option>
					<option value="BNSSA">BNSSA</option>
					<option value="MNS">MNS</option>
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Ordre d'affichage</span>
				<input class="field" type="number" name="ordre" value="0" min="0" max="999" />
			</label>
			<label class="flex items-center gap-2 sm:col-span-2">
				<input type="checkbox" name="obligatoire" class="h-4 w-4 accent-teal" />
				<span class="text-[13px] font-semibold text-ink">Document obligatoire</span>
			</label>
			<div class="sm:col-span-2">
				<button class="cta-sand" type="submit">Créer le type</button>
			</div>
		</form>
	</div>
{/if}

{#if data.types.length === 0}
	<p class="text-[14px] text-muted">Aucun type de document défini pour l'instant.</p>
{:else}
	<div class="flex flex-col gap-3">
		{#each data.types as t (t.id)}
			<div class="card-lagon {t.actif ? '' : 'opacity-60'}">
				{#if editId === t.id}
					{#if form?.action === 'modifier' && form?.error}
						<div class="mb-3 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{form.error}</div>
					{/if}
					<form method="POST" action="?/modifier" use:enhance class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<input type="hidden" name="id" value={t.id} />
						<label class="flex flex-col gap-1 sm:col-span-2">
							<span class="text-[13px] font-semibold text-ink">Libellé</span>
							<input class="field" name="libelle" value={t.libelle} required />
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-[13px] font-semibold text-ink">Niveau concerné</span>
							<select class="field" name="niveauRequis" value={t.niveauRequis ?? ''}>
								<option value="">Tous</option>
								<option value="BNSSA">BNSSA</option>
								<option value="MNS">MNS</option>
							</select>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-[13px] font-semibold text-ink">Ordre d'affichage</span>
							<input class="field" type="number" name="ordre" value={t.ordre} min="0" max="999" />
						</label>
						<label class="flex items-center gap-2 sm:col-span-2">
							<input type="checkbox" name="obligatoire" class="h-4 w-4 accent-teal" checked={t.obligatoire} />
							<span class="text-[13px] font-semibold text-ink">Document obligatoire</span>
						</label>
						<div class="flex gap-2 sm:col-span-2">
							<button class="cta-sand inline-flex w-auto items-center gap-1.5 px-4" type="submit"><Check size={16} /> Enregistrer</button>
							<button class="rounded-cta border border-card-border px-4 py-2 text-[13px] font-semibold text-ink" type="button" onclick={() => (editId = null)}>Annuler</button>
						</div>
					</form>
				{:else}
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex flex-wrap items-center gap-2">
							<span class="font-display text-[15px] font-bold text-ink">{t.libelle}</span>
							{#if t.obligatoire}
								<span class="rounded-pill bg-sand/40 px-2.5 py-0.5 text-[11px] font-bold text-ink">Obligatoire</span>
							{:else}
								<span class="rounded-pill bg-black/5 px-2.5 py-0.5 text-[11px] font-bold text-muted">Facultatif</span>
							{/if}
							{#if t.niveauRequis}
								<span class="rounded-pill bg-bnssa-bg px-2.5 py-0.5 text-[11px] font-bold text-teal">{t.niveauRequis}</span>
							{/if}
							{#if !t.actif}
								<span class="rounded-pill bg-black/5 px-2.5 py-0.5 text-[11px] font-bold text-muted">Désactivé</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<button class="rounded-cta border border-card-border px-3 py-1.5 text-[13px] font-semibold text-ink" type="button" onclick={() => (editId = t.id)}>Modifier</button>
							<form method="POST" action="?/activer" use:enhance>
								<input type="hidden" name="id" value={t.id} />
								<input type="hidden" name="actif" value={t.actif ? 'false' : 'true'} />
								<button class="inline-flex items-center gap-1.5 rounded-cta border px-3 py-1.5 text-[13px] font-semibold {t.actif ? 'border-card-border text-muted' : 'border-teal/30 bg-bnssa-bg text-teal'}" type="submit">
									{#if t.actif}<EyeOff size={15} /> Désactiver{:else}<Eye size={15} /> Réactiver{/if}
								</button>
							</form>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
