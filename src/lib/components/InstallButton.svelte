<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { ripple } from '$lib/actions/ripple';
	import { Download, Share, SquarePlus } from 'lucide-svelte';

	// Bouton d'installation adaptatif :
	// - Android/Chromium : capte `beforeinstallprompt` → appelle prompt().
	// - iOS/Safari : pas d'API → modale d'instructions « Partager → Sur l'écran d'accueil ».
	// - Masqué si déjà installé (standalone) ou si aucun mécanisme n'est disponible.

	let deferred = $state<BeforeInstallPromptEvent | null>(null);
	let isIOS = $state(false);
	let standalone = $state(false);
	let installed = $state(false);
	let showIOS = $state(false);

	const disponible = $derived(!standalone && !installed && (deferred !== null || isIOS));

	onMount(() => {
		standalone =
			window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

		const ua = navigator.userAgent;
		// iPad récent se présente en « Macintosh » → on teste aussi le tactile.
		isIOS =
			/iphone|ipad|ipod/i.test(ua) ||
			(/Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
		// Safari iOS uniquement (pas Chrome/Firefox iOS qui ne peuvent pas installer).
		if (isIOS && /(CriOS|FxiOS|EdgiOS)/.test(ua)) isIOS = false;

		const onPrompt = (e: BeforeInstallPromptEvent) => {
			e.preventDefault();
			deferred = e;
		};
		const onInstalled = () => {
			installed = true;
			deferred = null;
		};
		window.addEventListener('beforeinstallprompt', onPrompt);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('beforeinstallprompt', onPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	});

	async function installer() {
		if (deferred) {
			await deferred.prompt();
			await deferred.userChoice;
			deferred = null; // un prompt n'est utilisable qu'une fois
		} else if (isIOS) {
			showIOS = true;
		}
	}
</script>

{#if disponible}
	<div class="card-lagon">
		<div class="flex items-center gap-3">
			<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-cta bg-bnssa-bg text-teal">
				<Download size={22} />
			</span>
			<div class="min-w-0 flex-1">
				<h2 class="font-display text-[15px] font-bold text-ink">Installer l'application</h2>
				<p class="text-[12.5px] text-muted">Accès rapide depuis l'écran d'accueil, en plein écran.</p>
			</div>
		</div>
		<button class="cta-sand mt-3 inline-flex w-full items-center justify-center gap-2" onclick={installer} use:ripple>
			<Download size={18} /> Installer l'app
		</button>
	</div>
{/if}

<Modal open={showIOS} title="Installer KronoPool" onClose={() => (showIOS = false)}>
	<div class="flex flex-col gap-3 text-[14px] text-ink">
		<p>Sur iPhone/iPad, ajoutez KronoPool à votre écran d'accueil depuis Safari :</p>
		<ol class="flex flex-col gap-2">
			<li class="flex items-center gap-2.5">
				<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bnssa-bg font-bold text-teal">1</span>
				<span class="flex flex-wrap items-center gap-1">
					Touchez <Share size={17} class="inline text-teal" /> <strong>Partager</strong> (barre du bas).
				</span>
			</li>
			<li class="flex items-center gap-2.5">
				<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bnssa-bg font-bold text-teal">2</span>
				<span class="flex flex-wrap items-center gap-1">
					Choisissez <SquarePlus size={17} class="inline text-teal" /> <strong>« Sur l'écran d'accueil »</strong>.
				</span>
			</li>
			<li class="flex items-center gap-2.5">
				<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bnssa-bg font-bold text-teal">3</span>
				<span>Validez avec <strong>« Ajouter »</strong>. L'icône apparaît sur l'écran d'accueil.</span>
			</li>
		</ol>
	</div>
	{#snippet footer()}
		<button type="button" class="cta-sand" onclick={() => (showIOS = false)}>J'ai compris</button>
	{/snippet}
</Modal>
