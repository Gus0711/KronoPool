<script lang="ts">
	import { enhance } from '$app/forms';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import ValiditePill from '$lib/components/ValiditePill.svelte';
	import { toasts } from '$lib/toast';
	import { ArrowLeft, LogOut } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);

	const estIntervenant = $derived(data.user?.role === 'intervenant');

	$effect(() => {
		if (form?.success) toasts.success('Mot de passe modifié ✓');
	});
</script>

<svelte:head><title>Mon compte · KronoPool</title></svelte:head>

<div class="mx-auto flex min-h-[100dvh] max-w-app flex-col bg-bg">
	<div class="flex flex-1 flex-col">
		<AppHeader prenom={data.infos.prenom} nom={data.infos.nom} title="Mon compte" />

		<div class="flex-1 overflow-y-auto px-5 pb-6 pt-4">
			{#if !estIntervenant}
				<a href="/dashboard" class="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-teal">
					<ArrowLeft size={16} /> Retour au tableau de bord
				</a>
			{/if}

			<!-- Infos -->
			<div class="card-lagon mb-4">
				<div class="mb-3 flex items-center justify-between">
					<div>
						<div class="font-display text-[17px] font-bold text-ink">
							{data.infos.prenom} {data.infos.nom}
						</div>
						<div class="text-[13px] text-muted">{data.infos.email}</div>
					</div>
					{#if data.infos.niveau}<NiveauBadge niveau={data.infos.niveau} />{/if}
				</div>
				<dl class="space-y-2 text-[13px]">
					{#if data.infos.telephone}
						<div class="flex justify-between">
							<dt class="text-muted">Téléphone</dt>
							<dd class="font-medium text-ink">{data.infos.telephone}</dd>
						</div>
					{/if}
					{#if data.infos.role === 'intervenant'}
						<div class="flex items-center justify-between gap-2">
							<dt class="text-muted">Validité titre</dt>
							<dd><ValiditePill {...data.validites.titre} /></dd>
						</div>
						<div class="flex items-center justify-between gap-2">
							<dt class="text-muted">Validité PSE1</dt>
							<dd><ValiditePill {...data.validites.pse} /></dd>
						</div>
					{/if}
				</dl>
			</div>

			<!-- Changement mot de passe -->
			<div class="card-lagon mb-4">
				<h2 class="mb-3 font-display text-[15px] font-bold text-ink">Changer mon mot de passe</h2>
				{#if form?.error}
					<div class="mb-3 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" role="alert">
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
					class="flex flex-col gap-3"
				>
					<input class="field" type="password" name="current" placeholder="Mot de passe actuel" autocomplete="current-password" required />
					<input class="field" type="password" name="password" placeholder="Nouveau mot de passe" autocomplete="new-password" required minlength="8" />
					<input class="field" type="password" name="confirm" placeholder="Confirmer" autocomplete="new-password" required minlength="8" />
					<button class="cta-sand" type="submit" disabled={loading}>
						{loading ? 'Enregistrement…' : 'Enregistrer'}
					</button>
				</form>
			</div>

			<a href="/deconnexion" class="inline-flex items-center gap-2 text-[14px] font-semibold text-danger" data-sveltekit-reload>
				<LogOut size={18} /> Se déconnecter
			</a>
		</div>
	</div>

	{#if estIntervenant}<BottomNav />{/if}
</div>
