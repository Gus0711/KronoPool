<script lang="ts">
	import { enhance } from '$app/forms';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import { toasts } from '$lib/toast';
	import { formatJour, formatPlage } from '$lib/format';
	import { ArrowLeft, Pencil, Trash2, Unlock, Phone } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showEdit = $state(false);

	const d = $derived(data.detail);
	const nbMnsActuel = $derived(d.postes.filter((p) => p.niveauRequis === 'MNS').length);
	const nbBnssaActuel = $derived(d.postes.filter((p) => p.niveauRequis === 'BNSSA').length);

	$effect(() => {
		if (form?.action === 'liberer') {
			if (form.ok) toasts.success('Poste libéré ✓');
			else toasts.error("Ce poste n'était pas réservé.");
		}
		if (form?.action === 'modifier' && form.ok) {
			toasts.success('Besoin mis à jour ✓');
			showEdit = false;
		}
	});

	const statutLabel: Record<string, string> = { avenir: 'À venir', complet: 'Complet', passe: 'Passé' };

	function confirmSuppression(e: SubmitEvent) {
		const msg =
			d.pourvus > 0
				? `Ce besoin a ${d.pourvus} réservation(s). Supprimer définitivement le besoin et ses postes ?`
				: 'Supprimer définitivement ce besoin ?';
		if (!confirm(msg)) e.preventDefault();
	}
</script>

<svelte:head><title>Détail besoin · KronoPool</title></svelte:head>

<a href="/besoins" class="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-teal">
	<ArrowLeft size={16} /> Retour aux besoins
</a>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="font-display text-[24px] font-bold text-ink">{formatJour(d.date)}</h1>
		<div class="text-[14px] text-muted">
			{formatPlage(d.heureDebut, d.heureFin)}
			· {d.pourvus}/{d.total} pourvus · {statutLabel[d.statut]}
			{#if d.commentaire}<br />{d.commentaire}{/if}
		</div>
	</div>
	<div class="flex gap-2">
		<button class="inline-flex items-center gap-1.5 rounded-cta border border-card-border bg-white px-3 py-2 text-[13px] font-semibold text-ink" onclick={() => (showEdit = !showEdit)}>
			<Pencil size={16} /> Éditer
		</button>
		<form method="POST" action="?/supprimer" onsubmit={confirmSuppression}>
			<button class="inline-flex items-center gap-1.5 rounded-cta border border-danger/30 bg-danger-bg px-3 py-2 text-[13px] font-semibold text-danger" type="submit">
				<Trash2 size={16} /> Supprimer
			</button>
		</form>
	</div>
</div>

{#if showEdit}
	<div class="card-lagon mb-6 max-w-xl">
		<h2 class="mb-3 font-display text-[15px] font-bold text-ink">Modifier le besoin</h2>
		{#if form?.action === 'modifier' && form?.error}
			<div class="mb-3 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{form.error}</div>
		{/if}
		<form method="POST" action="?/modifier" use:enhance class="flex flex-col gap-3">
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Date</span>
				<input class="field" type="date" name="date" value={d.date} required />
			</label>
			<div class="flex gap-3">
				<label class="flex flex-1 flex-col gap-1">
					<span class="text-[13px] font-semibold text-ink">Début</span>
					<input class="field" type="time" name="heureDebut" value={d.heureDebut} required />
				</label>
				<label class="flex flex-1 flex-col gap-1">
					<span class="text-[13px] font-semibold text-ink">Fin</span>
					<input class="field" type="time" name="heureFin" value={d.heureFin} required />
				</label>
			</div>
			<label class="flex flex-col gap-1">
				<span class="text-[13px] font-semibold text-ink">Commentaire</span>
				<input class="field" type="text" name="commentaire" value={d.commentaire ?? ''} />
			</label>
			<div class="flex gap-3">
				<label class="flex flex-1 flex-col gap-1">
					<span class="text-[13px] font-semibold text-ink">Postes MNS</span>
					<input class="field" type="number" name="nbMns" min="0" max="50" value={nbMnsActuel} required />
				</label>
				<label class="flex flex-1 flex-col gap-1">
					<span class="text-[13px] font-semibold text-ink">Postes BNSSA</span>
					<input class="field" type="number" name="nbBnssa" min="0" max="50" value={nbBnssaActuel} required />
				</label>
			</div>
			<p class="text-[12px] text-muted">
				Augmenter le nombre ajoute des postes libres. Le réduire supprime des postes libres uniquement — pour retirer un poste réservé, libérez-le d'abord ci-dessous.
			</p>
			<div class="flex gap-2">
				<button class="cta-sand" type="submit">Enregistrer</button>
				<button class="rounded-cta border border-card-border bg-white px-4 py-2 text-[14px] font-semibold text-muted" type="button" onclick={() => (showEdit = false)}>Annuler</button>
			</div>
		</form>
	</div>
{/if}

<h2 class="mb-3 font-display text-[16px] font-bold text-ink">Postes ({d.total})</h2>
<div class="flex flex-col gap-3">
	{#each d.postes as p (p.id)}
		<div class="card-lagon flex items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<NiveauBadge niveau={p.niveauRequis} />
				{#if p.intervenant}
					<div>
						<div class="font-display text-[15px] font-bold text-ink">
							{p.intervenant.prenom} {p.intervenant.nom}
						</div>
						{#if p.intervenant.telephone}
							<a href="tel:{p.intervenant.telephone.replace(/\s+/g, '')}" class="inline-flex items-center gap-1 text-[12px] text-muted">
								<Phone size={12} /> {p.intervenant.telephone}
							</a>
						{/if}
					</div>
				{:else}
					<span class="text-[14px] font-medium text-muted">Libre</span>
				{/if}
			</div>
			{#if p.reservedBy}
				<form method="POST" action="?/liberer" use:enhance>
					<input type="hidden" name="posteId" value={p.id} />
					<button class="inline-flex items-center gap-1.5 rounded-cta border border-card-border bg-white px-3 py-2 text-[13px] font-semibold text-teal" type="submit">
						<Unlock size={15} /> Libérer
					</button>
				</form>
			{/if}
		</div>
	{/each}
</div>
