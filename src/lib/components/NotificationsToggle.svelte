<script lang="ts">
	import { onMount } from 'svelte';
	import { ripple } from '$lib/actions/ripple';
	import { toasts } from '$lib/toast';
	import { Bell, BellOff, BellRing } from 'lucide-svelte';

	// Activation/désactivation des notifications push pour l'appareil courant.
	// La clé publique VAPID vient du serveur ; null → push non configuré → masqué.
	let { publicKey }: { publicKey: string | null } = $props();

	type Etat = 'inconnu' | 'non-supporte' | 'bloque' | 'off' | 'on';
	let etat = $state<Etat>('inconnu');
	let busy = $state(false);

	function urlBase64ToUint8Array(base64: string): Uint8Array {
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
		const raw = atob(b64);
		const out = new Uint8Array(raw.length);
		for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
		return out;
	}

	const supporte = () =>
		typeof navigator !== 'undefined' &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window;

	async function enregistrerAbonnement(sub: PushSubscription): Promise<boolean> {
		const res = await fetch('/compte/notifications', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(sub.toJSON())
		});
		return res.ok;
	}

	onMount(async () => {
		if (!publicKey || !supporte()) {
			etat = 'non-supporte';
			return;
		}
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (Notification.permission === 'denied') {
				etat = 'bloque';
			} else if (sub) {
				// Un navigateur ne porte qu'un seul abonnement : on le (ré)associe à
				// l'utilisateur courant (utile après un changement de compte).
				await enregistrerAbonnement(sub).catch(() => {});
				etat = 'on';
			} else {
				etat = 'off';
			}
		} catch {
			etat = 'non-supporte';
		}
	});

	async function activer() {
		if (!publicKey) return;
		busy = true;
		try {
			const perm = await Notification.requestPermission();
			if (perm !== 'granted') {
				etat = perm === 'denied' ? 'bloque' : 'off';
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
			});
			if (!(await enregistrerAbonnement(sub))) throw new Error('save');
			etat = 'on';
			toasts.success('Notifications activées ✓');
		} catch {
			toasts.error("Impossible d'activer les notifications.");
		} finally {
			busy = false;
		}
	}

	async function desactiver() {
		busy = true;
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				const endpoint = sub.endpoint;
				await sub.unsubscribe();
				await fetch('/compte/notifications', {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ endpoint })
				});
			}
			etat = 'off';
			toasts.success('Notifications désactivées');
		} catch {
			toasts.error('Une erreur est survenue.');
		} finally {
			busy = false;
		}
	}
</script>

{#if etat !== 'non-supporte' && etat !== 'inconnu'}
	<div class="card-lagon">
		<div class="flex items-center gap-3">
			<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-cta bg-bnssa-bg text-teal">
				{#if etat === 'on'}<BellRing size={22} />{:else}<Bell size={22} />{/if}
			</span>
			<div class="min-w-0 flex-1">
				<h2 class="font-display text-[15px] font-bold text-ink">Notifications</h2>
				<p class="text-[12.5px] text-muted">
					{#if etat === 'on'}
						Activées sur cet appareil.
					{:else if etat === 'bloque'}
						Bloquées : autorisez-les dans les réglages du navigateur.
					{:else}
						Soyez alerté des nouveaux créneaux à pourvoir.
					{/if}
				</p>
			</div>
		</div>

		{#if etat === 'off'}
			<button class="cta-sand mt-3 inline-flex w-full items-center justify-center gap-2" onclick={activer} disabled={busy} use:ripple>
				<Bell size={18} /> {busy ? 'Activation…' : 'Activer les notifications'}
			</button>
		{:else if etat === 'on'}
			<button
				class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-cta border border-card-border px-4 py-2.5 text-[14px] font-semibold text-ink"
				onclick={desactiver}
				disabled={busy}
			>
				<BellOff size={18} /> {busy ? 'Désactivation…' : 'Désactiver'}
			</button>
		{/if}
	</div>
{/if}
