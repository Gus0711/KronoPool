# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

**KronoPool** — application web **mobile-first** de gestion des plannings d'intervenants
(surveillance de piscine). Un directeur publie des **besoins** (créneaux à pourvoir) ; des
intervenants extérieurs (**MNS** / **BNSSA**) **réservent** un poste libre en « premier arrivé,
premier servi », sans validation. Interface **en français**, fuseau **Europe/Paris**.

**État actuel : V1 livrée et déployée en production** (homelab Proxmox derrière un Cloudflare
Tunnel). Au-delà du périmètre V1 du CDC, sont implémentés : **pauses** à horaire précis dans les
besoins, **documents intervenants** (upload + types configurables + conformité), **PWA**
installable, **notifications Web Push** (3 événements), planning admin en vue semaine avec feu
tricolore, assignation manuelle d'un poste par l'admin.

## Documents de référence

- **`docs/ARCHITECTURE.md`** — description de référence de **ce qui est implémenté** : modèle de
  données réel, permissions, flux clés (réservation, notifications, documents). **À lire en premier.**
- **`docs/AUDIT.md`** — audit sécurité/qualité (2 juillet 2026) : faiblesses connues classées par
  sévérité et priorités de correction. À consulter avant de toucher à l'auth, au push, aux uploads
  ou aux exports CSV.
- **`CDC_planning-piscine_v1.md`** (racine) — cahier des charges d'origine. Fait foi pour le
  comportement V1 ; les features postérieures sont décrites dans ARCHITECTURE.md.
- **`docs/handoff/README.md`** — design system « 2a Lagon » (tokens, écrans intervenant).
  Fait foi pour le style.
- **`README.md`** — présentation, install locale, variables d'env, déploiement générique.
- **`docs/Déploiement KronoPool_Proxmox_Perso.md`** — runbook du déploiement réel (spécifique à
  l'infra perso de Gus : binding LAN, tunnel sur une autre machine, PCT 103).
- `docs/PLAN.md` et `docs/PLAN-documents-intervenants.md` — plans **historiques** de construction,
  conservés pour mémoire ; ne pas s'y fier pour l'état courant.

## Stack

- **SvelteKit** (SSR, Svelte 5). Adapter : `@sveltejs/adapter-node` (Docker/Proxmox). Cible
  future : `@sveltejs/adapter-vercel` — ne pas coder de dépendance à l'adapter.
- **SQLite via libSQL** + **Drizzle ORM**. Local : `DATABASE_URL=file:./data/app.db`. Futur :
  Turso (URL distante), **même code Drizzle**, seul l'env change. Connexion **lazy** (le client ne
  s'ouvre qu'au premier accès — nécessaire au build).
- **Auth maison** : sessions en base (token aléatoire stocké **hashé** SHA-256), cookie
  `httpOnly / Secure / SameSite=Lax`, expiration glissante. Hash mot de passe **Argon2id**
  (`@node-rs/argon2`).
- **Zod** sur les entrées serveur (form actions) — schémas centralisés dans
  `src/lib/server/validation.ts`.
- **Tailwind CSS**, mobile-first. Icônes : `lucide-svelte` (imports nommés uniquement). Polices
  Google : Bricolage Grotesque (titres) + Figtree (corps).
- **Web Push** : paquet `web-push`, clés VAPID (`PUBLIC_VAPID_KEY` côté client,
  `VAPID_PRIVATE_KEY` strictement serveur). **PWA** : `@vite-pwa/sveltekit` en `injectManifest`,
  service worker manuel `src/service-worker.ts`. Tests : **Vitest** (`npm run test`).

## Structure réelle

```
src/
  lib/
    heures.ts            # amplitude vs temps effectif (pauses) — testé
    components/          # design system (AppHeader, CreneauCard, WeekCalendar, BottomNav,
                         # NotificationsToggle, InstallButton, DocumentsSection…)
    server/
      db/                # schéma Drizzle + client libSQL lazy + seeds (seed.ts, seed-dev.ts)
      auth/              # sessions, hash, guards de rôle, rate-limit login
      services/          # besoins, creneaux (réservation atomique), reservations, recap-global,
                         # intervenants, documents, conformite, diplomes, eligibilite, csv
      push/              # webpush.ts (VAPID, envoi, purge 404/410) + notifications.ts (déclencheurs)
      storage/           # documents sur disque (<DOCUMENTS_DIR>/<userId>/<uuid>.<ext>)
      time.ts            # clés murales Europe/Paris (DST) — testé
      validation.ts      # schémas Zod
  hooks.server.ts        # session + guards de rôle par préfixe (couvre navigations ET POST)
  service-worker.ts      # precache assets, push, notificationclick
  routes/
    login/ · changer-mot-de-passe/ · deconnexion/
    compte/              # + documents/[id] (téléchargement protégé) + notifications (abonnement push)
    (admin)/             # dashboard, planning, besoins (+nouveau, +[id]), intervenants (+[id]),
                         # documents-types, recap (+export CSV)
    (intervenant)/       # creneaux, mes-reservations, mon-recap (+export CSV)
```

## Règles métier critiques (ne pas se tromper)

Ces règles se recoupent entre plusieurs fichiers (schéma, services, guards, UI) — les traiter comme un tout.

- **Éligibilité par niveau** : un MNS est *aussi* BNSSA. Poste **BNSSA** → réservable par BNSSA
  **ou** MNS ; poste **MNS** → **uniquement** MNS. Un intervenant ne voit **que** les postes libres
  éligibles à son niveau (un BNSSA ne voit jamais les postes MNS). Source unique :
  `services/eligibilite.ts` (testé) — le réutiliser, ne jamais réimplémenter.
- **Réservation atomique** (point critique, CDC §9) : `UPDATE poste SET reserved_by=?,
  reserved_at=? WHERE id=? AND reserved_by IS NULL`, dans une transaction, puis **vérifier le
  nombre de lignes affectées** : `1` = succès, `0` = « déjà réservé ». Toujours garder la clause
  `WHERE reserved_by IS NULL`. Vérifier **avant** l'UPDATE : éligibilité niveau + poste **futur**
  (`date+heure_debut > now` en Europe/Paris) + **pas déjà un poste sur ce besoin** (garde-fou
  double réservation — attention : non garanti par contrainte DB, voir AUDIT M4).
- **Pas d'annulation intervenant** : aucun bouton/route/action d'annulation côté intervenant. Seul
  l'**admin** peut **libérer** un poste (tracé `audit_log` + notification aux éligibles). Afficher
  le message « contacter le directeur par téléphone » (`PUBLIC_DIRECTEUR_TEL`).
- **Génération de postes** : à la création d'un besoin, l'admin saisit un nombre de MNS + un nombre
  de BNSSA → autant de lignes `poste`. Suppression d'un besoin = `ON DELETE CASCADE` sur les
  postes. L'édition refuse de réduire le nombre de postes sous le nombre de réservés.
- **Heures et pauses** : un besoin peut avoir une pause `pause_debut`/`pause_fin` (les deux ou
  aucune, incluse dans le créneau, temps effectif > 0 — validé par Zod). **Les récaps somment le
  temps effectif (pauses déduites)** des créneaux terminés ; l'amplitude brute est aussi affichée/
  exportée. **Statut besoin** = **calculé** (`À venir` / `Complet` / `Passé`), pas stocké ; récap =
  agrégat, **pas de table dédiée**.
- **Notifications push** : toujours en **fire-and-forget** (`void notifier…()`) — ne jamais
  bloquer une action sur l'envoi. Trois événements : besoin publié → éligibles ; poste libéré →
  éligibles ; réservation → admins.
- **Extensibilité modèle** : ne pas casser la compatibilité avec les évolutions prévues —
  personnel interne (futur champ `type_intervenant` sur `user`), taux horaire (futur
  `tarif_horaire` sur `poste`). Ne pas les implémenter tant que non demandés.

## Sécurité (côté serveur, pas seulement UI)

- Toutes les routes hors `/login` exigent une session valide. **Guards de rôle via
  `hooks.server.ts` (préfixes de chemin, couvre navigations ET form actions) + guards explicites
  (`requireAdmin`/`requireIntervenant`/`requireUser`) dans chaque action**. Rappel SvelteKit : les
  `+server.ts` et les actions n'exécutent pas les `load` de layout — toujours rappeler le guard
  dans le handler.
- Documents : owner-or-admin sur téléchargement et suppression ; binaires sous noms UUID hors de
  toute URL publique ; allowlist MIME sans SVG/HTML ; 10 Mo max.
- `must_change_password = true` (défaut à la création) → écran de changement **bloquant**.
  Compte `actif = false` : connexion refusée **et** sessions existantes invalidées.
- Mot de passe : min. 8 caractères, jamais loggé ni renvoyé. CSRF via form actions natives +
  `ORIGIN` (obligatoire derrière le tunnel). Rate-limiting sur `/login` (limite connue derrière le
  tunnel : AUDIT C1).
- Seed : **2 comptes admin** + types de documents par défaut, idempotent, identifiants via env,
  aucun mot de passe par défaut si la variable manque.
- Avant de modifier auth/upload/push/CSV : lire les constats correspondants dans `docs/AUDIT.md`.

## Design system « 2a Lagon » (tokens)

Détail complet dans `docs/handoff/README.md`. Essentiel : fond app `#eaf3f5` ; en-tête dégradé
`linear-gradient(155deg,#155e75,#0c4a5e,#082f3b)` avec « vague » SVG en bas ; accent sable CTA
`#e0b676` (texte `#3a2a10`) ; teal marque `#155e75` ; cartes blanches rayon 16px bordure
`#d7e6e9` ; badge BNSSA (fond `#dceef1`/texte teal), badge MNS (fond sable/texte `#0b2a33`).
Espace intervenant : colonne centrée **max ~480px** même sur grand écran ; nav basse à 4 onglets
(Créneaux · Réservations · Récap · Compte). Enrichissements « Lagon vivant » : vagues animées
(`WaterWaves.svelte`), jauges d'eau (`HoursGauge.svelte`) — animations coupées par
`prefers-reduced-motion`. L'espace admin réutilise les mêmes tokens en layout desktop responsive
(tiroir latéral en mobile).

## Commandes

```bash
npm run dev                # serveur de dev (http://localhost:5173)
npm run build              # build de production (adapter-node)
npm run preview            # prévisualiser le build
npm run check              # svelte-check (types)
npm run test               # Vitest (éligibilité, temps, diplômes, documents, heures)
npm run db:generate        # générer les migrations depuis le schéma
npm run db:migrate         # appliquer les migrations (drizzle-kit)
npm run db:migrate:apply   # appliquer les migrations au runtime (utilisé au boot Docker)
npm run db:seed            # migrations + comptes admin + types de documents (idempotent)
npm run db:seed:dev        # données de démo (2 intervenants + besoins) — jamais en prod
npm run db:studio          # explorateur Drizzle
node scripts/generate-vapid.mjs   # générer une paire de clés VAPID (push)
```

Environnement : Windows en dev, npm. Variables d'env : voir `.env.example` (documenté) et le
tableau du README — noter que `SESSION_SECRET` n'est **pas utilisée** par le code actuel, et que
les variables VAPID doivent être ajoutées au `docker-compose.yml` pour être actives en prod
(AUDIT M10).
