/**
 * Génère une paire de clés VAPID pour le Web Push.
 * Exécution : `node scripts/generate-vapid.mjs`
 *
 * Copier les valeurs dans les variables d'environnement (voir .env.example) :
 *   PUBLIC_VAPID_KEY   (publique, exposée au client)
 *   VAPID_PRIVATE_KEY  (secrète, serveur uniquement)
 *   VAPID_SUBJECT      (mailto:contact@…)
 *
 * ⚠️ Régénérer invalide tous les abonnements existants — ne le faire qu'une fois.
 */
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('PUBLIC_VAPID_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:contact@example.com');
