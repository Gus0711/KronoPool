import webpush from 'web-push';
import { and, eq, inArray } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';
import { db } from '../db';
import { pushSubscription } from '../db/schema';

/**
 * Couche bas niveau Web Push : configuration VAPID, envoi, purge des abonnements
 * périmés, et enregistrement/suppression d'un abonnement.
 *
 * Si les clés VAPID ne sont pas configurées, tout est **no-op** (l'app fonctionne
 * sans notifications). Lecture des clés au **runtime** (`$env/dynamic`) → compatible
 * Docker (env injecté au démarrage).
 */

let configured = false;

function configurer(): boolean {
	const publicKey = pubEnv.PUBLIC_VAPID_KEY;
	const privateKey = env.VAPID_PRIVATE_KEY;
	const subject = env.VAPID_SUBJECT || 'mailto:contact@example.com';
	if (!publicKey || !privateKey) return false;
	if (!configured) {
		webpush.setVapidDetails(subject, publicKey, privateKey);
		configured = true;
	}
	return true;
}

export interface PushPayload {
	title: string;
	body: string;
	url?: string;
	tag?: string;
}

/** Envoie une notification à tous les appareils des utilisateurs donnés. */
export async function envoyerAUtilisateurs(userIds: string[], payload: PushPayload): Promise<void> {
	if (userIds.length === 0 || !configurer()) return;

	const subs = await db
		.select()
		.from(pushSubscription)
		.where(inArray(pushSubscription.userId, userIds));
	if (subs.length === 0) return;

	const corps = JSON.stringify(payload);
	const perimes: string[] = [];

	await Promise.allSettled(
		subs.map(async (s) => {
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					corps
				);
			} catch (e) {
				const code = (e as { statusCode?: number }).statusCode;
				// 404/410 = abonnement expiré côté push service → on le retire.
				if (code === 404 || code === 410) perimes.push(s.id);
			}
		})
	);

	if (perimes.length > 0) {
		await db.delete(pushSubscription).where(inArray(pushSubscription.id, perimes));
	}
}

export interface AbonnementClient {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

/** Enregistre (ou met à jour) l'abonnement d'un appareil pour un utilisateur. */
export async function enregistrerAbonnement(userId: string, sub: AbonnementClient): Promise<void> {
	await db
		.insert(pushSubscription)
		.values({
			userId,
			endpoint: sub.endpoint,
			p256dh: sub.keys.p256dh,
			auth: sub.keys.auth
		})
		.onConflictDoUpdate({
			target: pushSubscription.endpoint,
			set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth }
		});
}

/** Supprime l'abonnement d'un appareil (désactivation par l'utilisateur). */
export async function supprimerAbonnement(userId: string, endpoint: string): Promise<void> {
	await db
		.delete(pushSubscription)
		.where(and(eq(pushSubscription.endpoint, endpoint), eq(pushSubscription.userId, userId)));
}

/** Les clés VAPID sont-elles configurées (envoi possible) ? */
export function pushDisponible(): boolean {
	return !!pubEnv.PUBLIC_VAPID_KEY && !!env.VAPID_PRIVATE_KEY;
}
