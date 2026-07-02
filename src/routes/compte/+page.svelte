<script lang="ts">
	import { enhance } from '$app/forms';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import NiveauBadge from '$lib/components/NiveauBadge.svelte';
	import ValiditePill from '$lib/components/ValiditePill.svelte';
	import DocumentsSection from '$lib/components/DocumentsSection.svelte';
	import InstallButton from '$lib/components/InstallButton.svelte';
	import NotificationsToggle from '$lib/components/NotificationsToggle.svelte';
	import { ripple } from '$lib/actions/ripple';
	import { toasts } from '$lib/toast';
	import { ArrowLeft, LogOut, CalendarPlus, Copy, RefreshCw } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);

	const estIntervenant = $derived(data.user?.role === 'intervenant');
	// Abonnement calendrier — liens adaptés à chaque plateforme :
	// - webcal:// : pris en charge par Apple Calendrier (iOS/macOS). Android n'a
	//   aucun handler pour ce schéma → il faut passer par Google Agenda / le lien.
	// - Google Agenda : deep link « ajouter par URL » (ordinateur surtout).
	const webcalUrl = $derived(data.calendrierUrl?.replace(/^https?:\/\//, 'webcal://') ?? '');
	const googleUrl = $derived(
		data.calendrierUrl
			? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(data.calendrierUrl)}`
			: ''
	);

	$effect(() => {
		if (form?.action === 'motDePasse' && form.success) toasts.success('Mot de passe modifié ✓');
		if (form?.action === 'calendrier' && form.success) {
			toasts.success(form.regenere ? 'Nouveau lien généré ✓' : 'Abonnement calendrier activé ✓');
		}
	});

	async function copier() {
		if (!data.calendrierUrl) return;
		try {
			await navigator.clipboard.writeText(data.calendrierUrl);
			toasts.success('Lien copié ✓');
		} catch {
			toasts.error('Copie impossible — sélectionnez le lien manuellement.');
		}
	}
</script>

<svelte:head><title>Mon compte · KronoPool</title></svelte:head>

<div class="app-water-bg mx-auto flex min-h-[100dvh] max-w-app flex-col">
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

			<!-- Mes documents (intervenants) -->
			{#if estIntervenant}
				<div class="mb-4">
					<DocumentsSection
						documents={data.documents}
						types={data.typesDocuments}
						conformite={data.conformite}
						titre="Mes documents"
						soustitre="Carte d'identité, diplôme, PSE1…"
					/>
				</div>
			{/if}

			<!-- Changement mot de passe -->
			<div class="card-lagon mb-4">
				<h2 class="mb-3 font-display text-[15px] font-bold text-ink">Changer mon mot de passe</h2>
				{#if form?.action === 'motDePasse' && form?.error}
					<div class="mb-3 rounded-cta border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" role="alert">
						{form.error}
					</div>
				{/if}
				<form
					method="POST"
					action="?/motDePasse"
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
					<button class="cta-sand" type="submit" disabled={loading} use:ripple>
						{loading ? 'Enregistrement…' : 'Enregistrer'}
					</button>
				</form>
			</div>

			<!-- Abonnement calendrier iCal (intervenants) -->
			{#if estIntervenant}
				<div class="card-lagon mb-4">
					<h2 class="mb-1 flex items-center gap-2 font-display text-[15px] font-bold text-ink">
						<CalendarPlus size={18} class="text-teal" /> Mon calendrier
					</h2>
					<p class="mb-3 text-[13px] text-muted">
						Ajoutez vos créneaux réservés à Google Agenda, Apple Calendrier, etc. Ils se
						mettent à jour automatiquement.
					</p>

					{#if !data.calendrierUrl}
						<form method="POST" action="?/calendrier" use:enhance>
							<button class="cta-sand inline-flex items-center gap-2" type="submit" use:ripple>
								<CalendarPlus size={18} /> Activer l'abonnement
							</button>
						</form>
					{:else}
						<div class="flex flex-col gap-2">
							<a
								href={googleUrl}
								target="_blank"
								rel="noopener"
								class="cta-sand inline-flex items-center justify-center gap-2"
								use:ripple
							>
								<CalendarPlus size={18} /> Ajouter à Google Agenda
							</a>
							<a
								href={webcalUrl}
								class="inline-flex items-center justify-center gap-2 rounded-cta border border-card-border bg-white px-4 py-3 text-[14px] font-semibold text-teal"
							>
								<CalendarPlus size={18} /> Apple Calendrier (iPhone/Mac)
							</a>

							<p class="mt-1 text-[12px] text-muted">
								Sur <span class="font-semibold">Android</span>, le bouton Google ouvre l'ajout par
								URL (au besoin, copiez le lien ci-dessous et ajoutez-le dans Google Agenda sur
								ordinateur : <span class="whitespace-nowrap">Autres agendas → À partir de l'URL</span>).
							</p>

							<div class="flex items-center gap-2">
								<input class="field flex-1 text-[12px]" type="text" value={data.calendrierUrl} readonly onclick={(e) => e.currentTarget.select()} />
								<button class="inline-flex shrink-0 items-center gap-1 rounded-cta border border-card-border bg-white px-3 py-2.5 text-[13px] font-semibold text-teal" type="button" onclick={copier}>
									<Copy size={15} /> Copier
								</button>
							</div>
							<p class="text-[12px] text-muted">
								Ce lien est personnel et secret. En cas de partage accidentel, régénérez-le
								(l'ancien cessera de fonctionner).
							</p>
							<form method="POST" action="?/calendrier" use:enhance>
								<input type="hidden" name="regenerer" value="true" />
								<button class="inline-flex items-center gap-1 text-[12px] font-semibold text-danger" type="submit">
									<RefreshCw size={13} /> Régénérer le lien
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Notifications push (masqué si non supporté) -->
			<div class="mb-4"><NotificationsToggle publicKey={data.pushPublicKey} /></div>

			<!-- Installer la PWA (masqué si déjà installée ou non disponible) -->
			<div class="mb-4"><InstallButton /></div>

			<a href="/deconnexion" class="inline-flex items-center gap-2 text-[14px] font-semibold text-danger" data-sveltekit-reload>
				<LogOut size={18} /> Se déconnecter
			</a>
		</div>
	</div>

	{#if estIntervenant}<BottomNav />{/if}
</div>
