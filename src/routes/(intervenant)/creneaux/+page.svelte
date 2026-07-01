<script lang="ts">
	import { enhance } from '$app/forms';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CreneauCard from '$lib/components/CreneauCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import { ripple } from '$lib/actions/ripple';
	import { toasts } from '$lib/toast';
	import { formatJour, formatPlage } from '$lib/format';
	import { ShieldAlert, Phone } from 'lucide-svelte';
	import type { Niveau } from '$lib/server/db/schema';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Créneau en attente de confirmation (ouvre la modale d'engagement).
	type Creneau = (typeof data.creneaux)[number];
	let pending = $state<Creneau | null>(null);
	let confirmOpen = $state(false);
	let submitting = $state(false);

	const telHref = $derived(data.directeurTel?.replace(/\s+/g, '') ?? '');

	function demander(c: Creneau) {
		pending = c;
		confirmOpen = true;
	}

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
		<EmptyState illus="bouee" title="Le bassin est calme">
			Aucun créneau disponible pour le moment. Repassez un peu plus tard&nbsp;!
		</EmptyState>
	{:else}
		{#each parJour as [jour, liste], ji (jour)}
			<div class="daylabel">{formatJour(jour)}</div>
			{#each liste as c, ci (c.posteId)}
				<CreneauCard
					heureDebut={c.heureDebut}
					heureFin={c.heureFin}
					niveau={c.niveauRequis}
					commentaire={c.commentaire}
					delay={Math.min((ji * 2 + ci) * 45, 360)}
				>
					{#snippet action()}
						<button
							class="cta-sand mt-[14px]"
							type="button"
							use:ripple
							onclick={() => demander(c)}
						>
							Réserver ce créneau
						</button>
					{/snippet}
				</CreneauCard>
			{/each}
		{/each}
	{/if}
</div>

<!-- Confirmation d'engagement avant réservation ferme -->
<Modal bind:open={confirmOpen} title="Confirmer votre réservation" onClose={() => (pending = null)}>
	{#if pending}
		<div class="card-lagon mb-4">
			<div class="flex items-center justify-between gap-3">
				<div class="font-display text-[18px] font-bold text-ink">
					{formatPlage(pending.heureDebut, pending.heureFin)}
				</div>
				<NiveauBadge niveau={pending.niveauRequis} />
			</div>
			<div class="mt-1 text-[13px] font-medium capitalize text-teal">
				{formatJour(pending.date)}
			</div>
			{#if pending.commentaire}
				<div class="mt-1 text-[13px] text-muted">{pending.commentaire}</div>
			{/if}
		</div>

		<div class="flex gap-2.5 rounded-cta border border-sand/50 bg-warn-bg px-3.5 py-3 text-[13px] leading-relaxed text-sand-ink">
			<ShieldAlert size={20} class="mt-px shrink-0 text-sand-dark" />
			<p>
				En réservant ce créneau, vous vous <strong>engagez fermement</strong> à assurer la
				surveillance sur toute la plage horaire. Cette réservation est
				<strong>définitive</strong> : elle ne peut pas être annulée depuis l'application.
				{#if telHref}
					En cas d'empêchement, contactez directement le directeur par téléphone.
				{/if}
			</p>
		</div>
	{/if}

	{#snippet footer()}
		<form
			method="POST"
			action="?/reserver"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					if (result.type === 'success' && result.data) {
						const d = result.data as { ok: boolean; message: string };
						if (d.ok) toasts.success(d.message);
						else toasts.error(d.message);
					}
					submitting = false;
					confirmOpen = false;
					pending = null;
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="posteId" value={pending?.posteId ?? ''} />
			<button class="cta-sand" type="submit" use:ripple disabled={submitting}>
				{submitting ? 'Réservation…' : 'Je confirme ma réservation'}
			</button>
		</form>
		{#if telHref}
			<a
				href="tel:{telHref}"
				class="inline-flex items-center justify-center gap-1.5 py-1 text-[12.5px] font-semibold text-muted"
			>
				<Phone size={14} /> {data.directeurTel}
			</a>
		{/if}
		<button
			type="button"
			class="rounded-cta px-4 py-2.5 text-center text-[14px] font-semibold text-muted transition hover:bg-white"
			onclick={() => {
				confirmOpen = false;
				pending = null;
			}}
		>
			Annuler
		</button>
	{/snippet}
</Modal>
