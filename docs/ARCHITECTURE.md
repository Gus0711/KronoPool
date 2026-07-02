# Architecture KronoPool

> État du code au 2 juillet 2026. Complète le [README](../README.md) (présentation, install,
> déploiement) et remplace les plans historiques (`PLAN.md`, `PLAN-documents-intervenants.md`)
> comme description de référence de ce qui est **réellement implémenté**.

## Vue d'ensemble

SvelteKit SSR (Svelte 5, adapter-node) + SQLite (libSQL) + Drizzle ORM. Tout l'état vit dans une
base fichier et un dossier de documents, sur le même volume persistant. Pas de service externe en
dehors des push services des navigateurs (Web Push) et de Google Fonts.

```
Navigateur ──HTTPS (Cloudflare Tunnel)──▶ adapter-node (conteneur Docker)
   │                                          │
   │  PWA : service worker (assets)           ├── SQLite  /data/app.db
   │  Web Push : abonnement VAPID             └── Fichiers /data/documents/<userId>/<uuid>.<ext>
   ▼
Push service (FCM / Mozilla / APNs…) ◀── web-push (serveur, clé privée VAPID)
```

## Modèle de données (`src/lib/server/db/schema.ts`)

| Table | Rôle | Points clés |
|---|---|---|
| `user` | Admins et intervenants | `role` (`admin`/`intervenant`), `niveau` (`MNS`/`BNSSA`, null pour admin), validités (`date_validite_titre` CAEPMNS, `date_validite_pse` PSE1), `must_change_password` (défaut `true`), `actif`, `password_hash` Argon2id. Email unique |
| `session` | Sessions serveur | **PK = token hashé SHA-256** (le token brut ne vit que dans le cookie), `expires_at`, cascade sur suppression du user |
| `besoin` | Créneau à pourvoir | `date` `YYYY-MM-DD`, `heure_debut`/`heure_fin` `HH:MM`, **pause optionnelle** (`pause_debut`/`pause_fin`, les deux ou aucune), `commentaire`, `created_by` |
| `poste` | Un poste dans un besoin | `niveau_requis`, `reserved_by` (**null = libre**), `reserved_at`. `ON DELETE CASCADE` depuis `besoin` |
| `audit_log` | Traçabilité | Libérations et assignations manuelles (action, ancien intervenant, admin, horodatage) |
| `document_type` | Catalogue configurable | `obligatoire`, `niveau_requis` (null = tous), `ordre`, `actif` (désactivation sans suppression) |
| `document` | Métadonnées d'un fichier | Le binaire est **sur disque** (`stored_name` = UUID + extension d'allowlist, jamais le nom client). `type_id` → `SET NULL` (supprimer un type ne détruit pas les fichiers). `date_expiration` optionnelle |
| `push_subscription` | Abonnement Web Push | `endpoint` unique, clés `p256dh`/`auth`, un par appareil/navigateur, cascade sur le user |
| `rappel` | Rappels de créneau déjà envoyés | Une ligne par (`poste`, `kind` = `j1`/`h2`), unique ; idempotence du planificateur ; cascade sur le poste |

Colonnes notables ajoutées à `user` : `calendar_token` (jeton secret de l'abonnement iCal, unique, nullable).

Conventions : ids = UUID texte ; dates métier = texte `YYYY-MM-DD` ; heures = texte `HH:MM` ;
horodatages système = timestamp entier. **Rien de calculable n'est stocké** : statut d'un besoin
(À venir / Complet / Passé) et récaps d'heures sont des agrégats à la volée.

Extensibilité réservée (ne pas casser) : futur `type_intervenant` sur `user` (personnel interne),
futur `tarif_horaire` sur `poste`.

## Rôles et permissions

Deux couches, toutes deux **côté serveur** :

1. **`src/hooks.server.ts`** — s'exécute pour chaque requête (navigations **et** POST/actions) :
   - résout la session (cookie `kp_session` → hash → table `session`), prolonge l'expiration
     glissante (30 j, renouvelée sous 15 j), purge les sessions expirées ou d'un compte désactivé ;
   - non connecté → redirection `/login` (seule route publique) ;
   - `must_change_password` → blocage sur `/changer-mot-de-passe` (seule échappatoire :
     `/deconnexion`) ;
   - garde par **préfixe de chemin** : `/dashboard /besoins /intervenants /recap /planning
     /documents-types` = admin ; `/creneaux /mes-reservations /mon-recap` = intervenant ;
     `/compte` = tout utilisateur connecté.
2. **Guards explicites** (`src/lib/server/auth/guards.ts`) — `requireAdmin` /
   `requireIntervenant` / `requireUser` rappelés dans les `load` de layout et dans **chaque form
   action** (défense en profondeur).

⚠️ Subtilité SvelteKit à connaître : les endpoints `+server.ts` et les form actions n'exécutent
**pas** les `load` de layout — leur protection vient de hooks.server.ts et/ou du guard appelé dans
le handler. C'est pourquoi chaque action rappelle son guard.

Accès aux documents : owner-or-admin, vérifié dans `GET /compte/documents/[id]` et à la
suppression (l'intervenant ne touche que ses fichiers ; l'admin gère ceux de tous).

## Flux clés

### Authentification et sessions (`src/lib/server/auth/`)

- Mot de passe : **Argon2id** (m=19 MiB, t=2, p=1 — recommandations OWASP), min. 8 caractères,
  jamais loggé ni renvoyé.
- Login : rate-limit en mémoire par IP (10 essais/min — voir AUDIT C1 pour la limite derrière un
  tunnel), message d'erreur générique, redirection selon rôle.
- Session : token aléatoire 256 bits ; en base ne vit que son **hash SHA-256**. Cookie
  `httpOnly / Secure (hors dev) / SameSite=Lax`. Désactiver un compte invalide immédiatement
  toutes ses sessions ; réinitialiser un mot de passe aussi, et force `must_change_password`.

### Réservation d'un poste (« premier arrivé, premier servi ») — `services/creneaux.ts`

Dans une **transaction** :

1. recharger le poste + son besoin ;
2. vérifier : éligibilité (`services/eligibilite.ts` — MNS ⊇ BNSSA), poste **futur**
   (`date + heure_debut > maintenant` en Europe/Paris), pas déjà un poste réservé sur **ce**
   besoin ;
3. pas de **chevauchement** avec un autre créneau déjà réservé le même jour (on ne peut pas être à
   deux postes en même temps) ;
4. `UPDATE poste SET reserved_by=?, reserved_at=? WHERE id=? AND reserved_by IS NULL` ;
5. `rowsAffected === 1` → succès ; `0` → « déjà réservé » (l'UI retire la carte et affiche un
   toast).

Le même garde-fou de chevauchement s'applique à l'assignation manuelle admin, et les créneaux en
conflit sont masqués de la liste de l'intervenant (`listerCreneaux`).

L'**assignation manuelle** par l'admin (`services/besoins.ts`) applique les mêmes garde-fous
(intervenant actif, éligible, poste libre, pas de doublon sur le besoin) + écrit dans `audit_log`.
La **libération** par l'admin remet `reserved_by = NULL`, trace dans `audit_log` et notifie les
éligibles. Aucun chemin d'annulation côté intervenant (appel au directeur).

### Calcul des heures (`src/lib/heures.ts`, testé)

Chaque créneau a une **amplitude** (`heure_fin − heure_debut`) et un **temps effectif**
(amplitude − pause). Les récaps (intervenant `services/reservations.ts`, global
`services/recap-global.ts`) somment le **temps effectif** des créneaux **terminés**
(`heure_fin` passée) sur la période ; les exports CSV donnent les deux colonnes.

### Besoins récurrents (série)

La création récurrente (`(admin)/besoins/recurrent`) génère **un besoin par occurrence** hebdomadaire
(jours cochés × intervalle de dates, plafonné à `MAX_OCCURRENCES = 52`) — l'énumération des dates est
une fonction pure et testée (`src/lib/recurrence.ts`, réutilisée côté serveur *et* pour l'aperçu
live du formulaire). Tous les besoins générés ensemble partagent un `serieId` (colonne nullable sur
`besoin`, indexée). La création groupée **ne déclenche pas** de notifications push (éviter une rafale
lors de la planification d'une saison). La fiche besoin affiche un badge « série » et permet de
supprimer les occurrences **futures et libres** de la série en un clic (`supprimerSerieFuture` —
épargne le passé et les réservations, symétrique de la protection de `supprimerBesoin`).

### Historique des interventions (admin)

La fiche intervenant (`(admin)/intervenants/[id]`) affiche l'**historique** de ses créneaux
terminés via `recapHeures(userId, from, to)` — mêmes données que le récap intervenant, filtrables
par période, avec total d'heures effectives et export CSV (`.../[id]/export`, guardé admin).
Corollaire : un besoin **passé qui porte des réservations** ne peut plus être supprimé
(`supprimerBesoin` le refuse côté serveur) — l'historique des heures effectuées est préservé ; un
poste passé se retire en le **libérant**, pas en supprimant le besoin.

### Temps et fuseau (`src/lib/server/time.ts`, testé)

Toutes les comparaisons « futur/passé » passent par des clés murales `YYYY-MM-DDTHH:MM` calculées
via `Intl.DateTimeFormat` en Europe/Paris — largeur fixe donc la comparaison lexicographique est
chronologique, et les changements d'heure (DST) sont absorbés sans conversion d'instant.

### Documents intervenants et conformité (`services/documents.ts`, `services/conformite.ts`)

- Upload (intervenant sur son compte, ou admin sur une fiche) : allowlist MIME **PDF / JPEG / PNG /
  WebP / HEIC** (ni SVG ni HTML — anti-XSS stocké), 10 Mo max, stockage sous
  `<DOCUMENTS_DIR>/<userId>/<uuid>.<ext>` — le nom client ne sert qu'à l'affichage.
- Téléchargement : uniquement via l'endpoint protégé (owner-or-admin), `Cache-Control: private,
  no-store` — aucune URL publique.
- Conformité : pour chaque type obligatoire applicable au niveau de l'intervenant, le document
  **le plus récent non expiré** fait foi ; alertes à 30 jours (`services/diplomes.ts` pour les
  validités CAEPMNS/PSE1). Badge sur la liste admin, bandeau côté intervenant.

### Notifications push (`src/lib/server/push/`)

- Clés VAPID : `PUBLIC_VAPID_KEY` (client, non secrète) / `VAPID_PRIVATE_KEY`
  (`$env/dynamic/private`, jamais exposée). Sans clés, l'app fonctionne sans push.
- Abonnement : `POST/DELETE /compte/notifications` (authentifié) → table `push_subscription`.
- Trois déclencheurs, tous **fire-and-forget** (`void notifier…()` — n'ajoutent jamais de latence
  à l'action, erreurs avalées) :
  | Événement | Déclencheur | Destinataires |
  |---|---|---|
  | Besoin publié | création d'un besoin | intervenants actifs éligibles à ≥ 1 poste |
  | Poste libéré | libération admin | intervenants actifs éligibles au niveau du poste |
  | Réservation | réservation d'un poste | admins actifs |
- Les abonnements répondant 404/410 sont purgés automatiquement.
- Service worker (`src/service-worker.ts`) : précache **uniquement** les assets statiques du build
  (aucune page SSR/authentifiée en cache — pas de mode hors-ligne), gère `push` (affichage) et
  `notificationclick` (focus/navigation).

**Rappels de créneau** (`src/lib/server/push/rappels.ts` + `src/lib/server/scheduler.ts`) : un
planificateur en process (démarré paresseusement au 1er accès dans `hooks.server.ts`, jamais au
build) appelle `envoyerRappelsDus()` toutes les 5 min. Il envoie un rappel **J-1** (< 24 h) et
**H-2** (< 2 h) à l'intervenant ayant réservé, en heure murale Europe/Paris convertie en instant réel
(`parisWallToInstant`, DST géré). Idempotence par la table `rappel` (une ligne par `poste`+`kind`,
`onConflictDoNothing`), purgée à la libération du poste. No-op si les clés VAPID sont absentes.
*Limite* : sur cible serverless (future Vercel), remplacer ce timer par un vrai cron appelant
`envoyerRappelsDus()`.

### Abonnement calendrier (iCal)

L'intervenant active un flux `.ics` personnel depuis `/compte` (action `calendrier` → jeton secret
`calendarToken` sur `user`, régénérable pour révoquer). La route **publique** `/calendrier/[token]`
(exemptée des guards dans `hooks.server.ts`, authentifiée par le seul jeton — modèle *capability*
comme les URL privées Google Calendar) sert un iCalendar RFC 5545 construit par
`src/lib/server/ical.ts` : créneaux réservés (fenêtre glissante 90 j) convertis en **UTC** (pas de
VTIMEZONE), échappement et repli de lignes conformes. Fonction de génération pure et testée.

### PWA

`@vite-pwa/sveltekit` en mode `injectManifest` (SW manuel), `registerType: autoUpdate`
(`skipWaiting` + `clients.claim`), manifest complet (icônes 192/512 + maskable, `standalone`,
`start_url` et `scope` `/`), bouton d'installation (`InstallButton.svelte`), métas iOS.

## Sécurité — synthèse

- CSRF : protection native SvelteKit sur les form actions (`ORIGIN` requis derrière un proxy).
  L'endpoint JSON `/compte/notifications` est hors de ce périmètre (voir AUDIT m5).
- Validation : schémas Zod centralisés (`src/lib/server/validation.ts`) — bornes, refinements
  métier (pause incluse dans le créneau, fin > début, temps effectif > 0).
- Secrets : `.env` ignoré par git et Docker ; seed idempotent sans mot de passe par défaut ni log
  de secret.
- Les faiblesses connues et leur priorisation : [`docs/AUDIT.md`](./AUDIT.md).

## Déploiement

Image Docker multi-étapes (build → runtime sans devDependencies), entrypoint =
`migrate.mjs` (migrations Drizzle versionnées) + `seed.mjs` (admins + types de documents,
idempotent) + `node build`. Volume persistant unique `/data` (base + documents). Exposition via
Cloudflare Tunnel ; `ORIGIN` obligatoire. Détails génériques dans le README, instance réelle dans
[`Déploiement KronoPool_Proxmox_Perso.md`](./Déploiement%20KronoPool_Proxmox_Perso.md).

## Tests

Vitest (`npm run test`) sur les briques sensibles : éligibilité, clés temporelles/DST, diplômes,
documents (validation upload), heures/pauses. Pas de tests end-to-end à ce jour (le Playwright
évoqué dans l'ancien plan n'a pas été mis en place).
