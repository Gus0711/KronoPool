<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';
	import ValiditePill from '$lib/components/ValiditePill.svelte';
	import { ripple } from '$lib/actions/ripple';
	import { toasts } from '$lib/toast';
	import { formatDateCourt, formatTaille } from '$lib/format';
	import { FileText, Upload, Trash2, Download, Plus } from 'lucide-svelte';
	import type { DocumentView, Conformite } from '$lib/server/services/documents';

	let {
		documents,
		types,
		conformite,
		titre = 'Documents',
		soustitre
	}: {
		documents: DocumentView[];
		types: { id: string; libelle: string }[];
		conformite?: Conformite;
		titre?: string;
		soustitre?: string;
	} = $props();

	let showUpload = $state(false);
	let uploading = $state(false);
	let aSupprimer = $state<{ id: string; nom: string } | null>(null);
	let suppression = $state(false);
</script>

<div class="card-lagon">
	<div class="mb-3 flex items-center justify-between gap-2">
		<div>
			<h2 class="font-display text-[15px] font-bold text-ink">{titre}</h2>
			{#if soustitre}<p class="text-[12px] text-muted">{soustitre}</p>{/if}
		</div>
		<button
			type="button"
			class="inline-flex shrink-0 items-center gap-1.5 rounded-cta border border-teal/30 bg-bnssa-bg px-3 py-1.5 text-[13px] font-semibold text-teal"
			onclick={() => (showUpload = !showUpload)}
		>
			<Plus size={16} /> Ajouter
		</button>
	</div>

	<!-- Conformité : documents obligatoires -->
	{#if conformite && conformite.lignes.length > 0}
		<div class="mb-3 flex flex-col gap-1.5 rounded-cta bg-bg/60 p-3">
			<span class="text-[12px] font-semibold text-muted">Documents obligatoires</span>
			{#each conformite.lignes as l (l.typeId)}
				<div class="flex items-center justify-between gap-2 text-[13px]">
					<span class="text-ink">{l.libelle}</span>
					{#if l.statut === 'present'}
						<ValiditePill date={l.dateExpiration} statut="ok" />
					{:else if l.statut === 'expire'}
						<ValiditePill date={l.dateExpiration} statut="expire" />
					{:else}
						<ValiditePill date={null} statut="absent" />
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Formulaire d'ajout -->
	{#if showUpload}
		<form
			method="POST"
			action="?/uploadDocument"
			enctype="multipart/form-data"
			use:enhance={() => {
				uploading = true;
				return async ({ result, update }) => {
					await update();
					uploading = false;
					if (result.type === 'success') {
						toasts.success('Document ajouté ✓');
						showUpload = false;
					} else if (result.type === 'failure') {
						toasts.error((result.data?.error as string) ?? 'Échec de l’envoi');
					}
				};
			}}
			class="mb-4 flex flex-col gap-3 rounded-cta border border-card-border p-3"
		>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Type de document</span>
				<select class="field" name="typeId">
					<option value="">— Autre / non catégorisé —</option>
					{#each types as t (t.id)}
						<option value={t.id}>{t.libelle}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Fichier</span>
				<input
					class="field"
					type="file"
					name="file"
					accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
					required
				/>
				<span class="text-[12px] text-muted">PDF, JPEG, PNG, WebP ou HEIC — 10 Mo max.</span>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Date d'expiration <span class="text-muted">(optionnel)</span></span>
				<input class="field" type="date" name="dateExpiration" />
			</label>
			<button class="cta-sand inline-flex items-center justify-center gap-2" type="submit" disabled={uploading} use:ripple>
				<Upload size={16} /> {uploading ? 'Envoi…' : 'Téléverser'}
			</button>
		</form>
	{/if}

	<!-- Liste des documents -->
	{#if documents.length === 0}
		<p class="py-3 text-center text-[13px] text-muted">Aucun document pour le moment.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each documents as d (d.id)}
				<li class="flex items-center gap-3 rounded-cta border border-card-border p-2.5">
					<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-cta bg-bnssa-bg text-teal">
						<FileText size={18} />
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-1.5">
							<a
								href="/compte/documents/{d.id}"
								target="_blank"
								rel="noopener"
								class="truncate text-[14px] font-semibold text-ink hover:text-teal hover:underline"
							>
								{d.nomFichier}
							</a>
							{#if d.typeLibelle}
								<span class="rounded-pill bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-muted">{d.typeLibelle}</span>
							{/if}
						</div>
						<div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
							<span>{formatTaille(d.taille)}</span>
							<span>· {formatDateCourt(d.uploadedAt.toISOString().slice(0, 10))}</span>
							{#if d.validite}
								<ValiditePill date={d.dateExpiration} statut={d.validite.statut} joursRestants={d.validite.joursRestants} />
							{/if}
						</div>
					</div>
					<a
						href="/compte/documents/{d.id}?download"
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-cta text-teal hover:bg-bnssa-bg"
						aria-label="Télécharger"
					>
						<Download size={17} />
					</a>
					<button
						type="button"
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-cta text-danger hover:bg-danger-bg"
						aria-label="Supprimer"
						onclick={() => (aSupprimer = { id: d.id, nom: d.nomFichier })}
					>
						<Trash2 size={17} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<!-- Confirmation de suppression -->
<Modal open={aSupprimer !== null} title="Supprimer le document" onClose={() => (aSupprimer = null)}>
	<p class="text-[14px] text-ink">
		Supprimer définitivement <strong>{aSupprimer?.nom}</strong> ? Cette action est irréversible.
	</p>
	{#snippet footer()}
		<form
			method="POST"
			action="?/supprimerDocument"
			use:enhance={() => {
				suppression = true;
				return async ({ result, update }) => {
					await update();
					suppression = false;
					aSupprimer = null;
					if (result.type === 'success') toasts.success('Document supprimé');
				};
			}}
		>
			<input type="hidden" name="id" value={aSupprimer?.id ?? ''} />
			<button class="w-full rounded-cta bg-danger px-4 py-2.5 text-[14px] font-semibold text-white" type="submit" disabled={suppression}>
				{suppression ? 'Suppression…' : 'Supprimer'}
			</button>
		</form>
		<button type="button" class="w-full rounded-cta border border-card-border px-4 py-2.5 text-[14px] font-semibold text-ink" onclick={() => (aSupprimer = null)}>
			Annuler
		</button>
	{/snippet}
</Modal>
