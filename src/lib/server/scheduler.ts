import { envoyerRappelsDus } from './push/rappels';

/**
 * Planificateur en process (adapter-node) : déclenche périodiquement l'envoi des
 * rappels de créneau. Démarré **paresseusement** à la première requête serveur
 * (jamais au build/prerender) et **une seule fois** par process.
 *
 * Limite connue : sur une cible **serverless** (future bascule Vercel), ce timer
 * ne survit pas — il faudra alors une vraie tâche planifiée (cron) appelant
 * `envoyerRappelsDus()`. En déploiement Docker/Proxmox actuel (process long), OK.
 */

const INTERVALLE_MS = 5 * 60 * 1000; // toutes les 5 minutes
const DELAI_INITIAL_MS = 20 * 1000; // laisse le serveur finir de démarrer

let demarre = false;

export function demarrerPlanificateur(): void {
	if (demarre) return;
	demarre = true;
	const tick = () => void envoyerRappelsDus();
	setTimeout(tick, DELAI_INITIAL_MS);
	setInterval(tick, INTERVALLE_MS);
}
