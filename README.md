# KronoPool

Application web **mobile-first** de gestion des plannings d'intervenants (surveillance de piscine).
Un directeur publie des **besoins** (créneaux à pourvoir) ; des intervenants **MNS** / **BNSSA**
**réservent** un poste libre en « premier arrivé, premier servi », sans validation.
Interface **en français**, fuseau **Europe/Paris**. Installable en **PWA**, avec
**notifications push** (Web Push).

> Références : [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) (modèle de données, permissions,
> flux clés) · [`CDC_planning-piscine_v1.md`](./CDC_planning-piscine_v1.md) (spécification d'origine) ·
> [`docs/handoff/`](./docs/handoff/) (design system « 2a Lagon ») ·
> [`docs/AUDIT.md`](./docs/AUDIT.md) (audit sécurité/qualité du 2 juillet 2026).

## Fonctionnalités

**Espace intervenant** (mobile, colonne ≤ 480 px, nav basse 4 onglets) :

- **Créneaux disponibles** : postes libres futurs, filtrés selon l'éligibilité (un MNS est aussi
  BNSSA ; un BNSSA ne voit jamais les postes MNS). Réservation **atomique** avec modale
  d'engagement (réservation ferme, pas d'annulation côté intervenant).
- **Mes réservations** : à venir / passées ; l'annulation passe par un appel au directeur (`tel:`).
- **Mon récap** : total d'heures par période (temps **effectif**, pauses déduites) + export CSV.
- **Mon compte** : changement de mot de passe, **documents** (upload CNI/diplômes/PSE1…, PDF/JPEG/
  PNG/WebP/HEIC, 10 Mo max, date d'expiration), activation des **notifications push**.

**Espace admin** (desktop responsive, tiroir latéral en mobile) :

- **Dashboard** : prochains besoins, postes non pourvus, alertes diplômes (expirés / < 30 j).
- **Planning** : vue semaine (feu tricolore ambre = à pourvoir / vert = complet / gris = passé)
  + vue liste ; création d'un besoin par clic sur un créneau.
- **Besoins** : création (date, horaires, **pause** optionnelle à horaire précis, nb MNS + nb
  BNSSA → génération des postes) ; **création récurrente** (« tous les samedis 9h-13h, 2 MNS »
  jusqu'à une date de fin → un besoin par date, regroupés en **série**) ; édition, suppression ;
  par poste : **libérer** (tracé dans `audit_log`), **assigner manuellement** un intervenant,
  supprimer un poste libre. Un besoin **passé qui porte des réservations** est protégé
  (suppression refusée — c'est de l'historique). Une **série** se supprime en un clic (occurrences
  futures et libres uniquement ; les réservées/passées sont conservées).
- **Intervenants** : création, édition, activation/désactivation (sessions invalidées),
  réinitialisation de mot de passe, documents + état de **conformité**, **historique des
  interventions** (créneaux passés, total d'heures effectives, filtre de période + export CSV).
- **Types de documents** configurables (obligatoire, restreint à un niveau, actif/inactif).
- **Récap global** par période + export CSV (amplitude et temps effectif).

**Transverse** : PWA installable (manifest + service worker, assets seuls en cache — pas de mode
hors-ligne pour les pages) ; notifications push sur 3 événements — *besoin publié* (intervenants
éligibles), *poste libéré* (intervenants éligibles), *réservation effectuée* (admins).

## Stack

- **SvelteKit** (SSR, Svelte 5) · adapter **Node** (cible future : Vercel, sans réécriture).
- **SQLite via libSQL** + **Drizzle ORM** (local : fichier ; futur : Turso, même code).
- **Auth maison** : sessions en base (token hashé SHA-256), cookie `httpOnly/Secure/SameSite=Lax`,
  expiration glissante · mots de passe **Argon2id** (`@node-rs/argon2`).
- **Zod** sur les entrées serveur · **Tailwind CSS** (tokens « 2a Lagon ») · `lucide-svelte`.
- **Web Push** (`web-push`, clés VAPID) · **PWA** via `@vite-pwa/sveltekit` · tests **Vitest**.

## Démarrage local

```bash
npm install
cp .env.example .env          # ajuster identifiants admin + PUBLIC_DIRECTEUR_TEL (+ VAPID si push)
npm run db:seed               # applique les migrations + crée les 2 comptes admin + types de documents
npm run db:seed:dev           # (optionnel) données de démo : 2 intervenants + besoins futurs
npm run dev                   # http://localhost:5173
```

Comptes de démo (`db:seed:dev`, mot de passe `motdepasse`) :
`camille@piscine.fr` (MNS) · `bruno@piscine.fr` (BNSSA).

Pour activer les notifications push en local : `node scripts/generate-vapid.mjs` puis recopier les
clés dans `.env` (`PUBLIC_VAPID_KEY` / `VAPID_PRIVATE_KEY`).

## Variables d'environnement

Documentées avec placeholders dans [`.env.example`](./.env.example). Ne jamais commiter `.env`.

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | libSQL — `file:./data/app.db` en local, `file:/data/app.db` en conteneur, URL Turso à terme |
| `DATABASE_AUTH_TOKEN` | Requis uniquement pour Turso (URL distante) |
| `DOCUMENTS_DIR` | Dossier des documents uploadés ; défaut dérivé de `DATABASE_URL` (`…/documents`) |
| `ORIGIN` | **Obligatoire derrière un proxy/tunnel** : URL publique exacte (schéma + domaine, sans slash final). Consommée par adapter-node pour la protection CSRF — sinon 403 sur tous les POST |
| `ADMIN1_*` / `ADMIN2_*` | Comptes admin créés par le seed (email, mot de passe, nom, prénom) |
| `PUBLIC_DIRECTEUR_TEL` | Téléphone du directeur affiché aux intervenants (annulation) |
| `PUBLIC_VAPID_KEY` | Clé publique Web Push (exposée au client — non secrète) |
| `VAPID_PRIVATE_KEY` | Clé privée Web Push (**secrète**, serveur uniquement) |
| `VAPID_SUBJECT` | Contact VAPID (`mailto:…`) |
| `SESSION_SECRET` | ⚠️ **Non utilisée à ce jour** (les tokens de session sont aléatoires et hashés, pas signés). Conservée pour d'éventuelles évolutions |
| `APP_PORT` | Port hôte publié par docker compose (le port interne reste 3000) |

Sans clés VAPID, l'app fonctionne normalement mais n'envoie aucune notification.

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm run preview` | Build de production (adapter-node) / prévisualisation |
| `npm run check` | Vérification des types (`svelte-check`) |
| `npm run test` / `npm run test:watch` | Tests Vitest (services : éligibilité, temps, diplômes, documents, heures) |
| `npm run db:generate` | Génère les migrations depuis le schéma Drizzle |
| `npm run db:migrate` | Applique les migrations (drizzle-kit) |
| `npm run db:migrate:apply` | Applique les migrations (runtime, sans drizzle-kit — utilisé au boot Docker) |
| `npm run db:seed` | Migrations + comptes admin + types de documents par défaut |
| `npm run db:seed:dev` | Données de démonstration (jamais lancé automatiquement) |
| `npm run db:studio` | Explorateur Drizzle |
| `node scripts/generate-vapid.mjs` | Génère une paire de clés VAPID pour le push |

## Structure

```
src/
  lib/
    components/            # Design system (AppHeader, CreneauCard, BottomNav, WeekCalendar,
                           # NotificationsToggle, InstallButton, DocumentsSection, jauges…)
    heures.ts              # Amplitude vs temps effectif (pauses déduites) — testé
    format.ts / toast.ts / calendar.ts
    server/
      db/                  # schéma Drizzle, client libSQL (lazy), seeds
      auth/                # hash Argon2id, sessions, guards de rôle, rate-limit
      services/            # besoins, créneaux (réservation atomique), réservations, récaps,
                           # intervenants, documents, conformité, diplômes, CSV, éligibilité
      push/                # web-push (VAPID) + déclencheurs de notifications
      storage/             # stockage disque des documents (noms UUID, hors URL publique)
      time.ts              # clés temporelles Europe/Paris (DST géré) — testé
      validation.ts        # schémas Zod
  hooks.server.ts          # résolution de session + guards de rôle par préfixe de route
  service-worker.ts        # precache assets + réception push + clic notification
  routes/
    login/ · changer-mot-de-passe/ · deconnexion/
    compte/                # profil, documents (+ téléchargement protégé), abonnement push
    (intervenant)/         # creneaux, mes-reservations, mon-recap (+ export CSV)
    (admin)/               # dashboard, planning, besoins, intervenants, documents-types,
                           # recap (+ export CSV)
```

## Règles métier clés

- **Éligibilité** : un MNS est aussi BNSSA. Poste BNSSA → BNSSA ou MNS ; poste MNS → MNS uniquement.
  Un intervenant ne voit que les postes libres éligibles à son niveau.
- **Réservation atomique** : `UPDATE poste SET reserved_by=? WHERE id=? AND reserved_by IS NULL`
  + contrôle du nombre de lignes affectées (1 = succès, 0 = déjà pris), en transaction.
  Éligibilité + poste futur (Europe/Paris) vérifiés avant. Un intervenant ne peut pas occuper
  deux postes du même besoin.
- **Pas d'annulation intervenant** : seul l'admin peut **libérer** un poste (tracé dans `audit_log`).
- **Heures** : chaque besoin a une *amplitude* (fin − début) et un *temps effectif* (pause déduite) ;
  les récaps somment le **temps effectif** des créneaux terminés. Statut besoin et récaps sont
  **calculés**, jamais stockés.
- **Conformité documents** : types configurables, obligation par niveau ; pour un type donné, le
  document le plus récent non expiré fait foi.

Détail complet : [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Déploiement (Proxmox / Docker)

Au démarrage, le conteneur **applique les migrations** puis **seed les comptes admin et les types
de documents** (idempotent). Aucune étape manuelle.

> 📌 **Déploiement réel de l'instance perso** : voir le runbook
> [`docs/Déploiement KronoPool_Proxmox_Perso.md`](./docs/Déploiement%20KronoPool_Proxmox_Perso.md)
> — il documente les particularités de cette archi (tunnel Cloudflare sur une autre machine →
> binding LAN au lieu de `127.0.0.1`). Les instructions ci-dessous décrivent le cas générique.

### Option A — docker compose (recommandé)

```bash
git clone <votre-repo> kronopool && cd kronopool
cp .env.example .env
nano .env          # identifiants ADMIN1/ADMIN2 + ORIGIN + PUBLIC_DIRECTEUR_TEL (+ clés VAPID)
sudo mkdir -p /srv/kronopool/data
docker compose up -d --build
docker compose logs -f          # migrations + seed au boot
```

> ⚠️ **Notifications push** : à ce jour, le bloc `environment:` de `docker-compose.yml` ne
> transmet **pas** `PUBLIC_VAPID_KEY`, `VAPID_PRIVATE_KEY` ni `VAPID_SUBJECT` au conteneur — même
> renseignées dans `.env`, les notifications restent inactives tant que ces trois lignes n'y sont
> pas ajoutées (constat [AUDIT M10](./docs/AUDIT.md)).

Par défaut l'app est publiée sur `127.0.0.1:<APP_PORT>` (défaut 3000) — adapté si le
tunnel/proxy tourne sur la même machine. Si le tunnel tourne ailleurs sur le LAN, voir le runbook.

### Option B — docker run

```bash
docker build -t kronopool .
docker run -d --name kronopool --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /srv/kronopool/data:/data \
  -e DATABASE_URL=file:/data/app.db \
  -e ORIGIN=https://app.example.com \
  -e ADMIN1_EMAIL=... -e ADMIN1_PASSWORD=... -e ADMIN1_NOM=... -e ADMIN1_PRENOM=... \
  -e ADMIN2_EMAIL=... -e ADMIN2_PASSWORD=... -e ADMIN2_NOM=... -e ADMIN2_PRENOM=... \
  -e PUBLIC_DIRECTEUR_TEL="06 XX XX XX XX" \
  -e PUBLIC_VAPID_KEY=... -e VAPID_PRIVATE_KEY=... -e VAPID_SUBJECT=mailto:contact@example.com \
  kronopool
```

### Exposition, sauvegarde, mise à jour

- **HTTPS** : exposer via **Cloudflare Tunnel** (`cloudflared`) ou un reverse-proxy sur un
  sous-domaine. Ne pas exposer le port applicatif brut sur Internet.
- **`ORIGIN` (obligatoire derrière un proxy)** : URL publique exacte, sans slash final — sinon
  **403 « Cross-site POST form submissions are forbidden »** sur tous les formulaires.
- **Sauvegarde** : tout est dans `/srv/kronopool/data/` — `app.db` (+ `-wal`/`-shm`) **et**
  `documents/` (pièces d'identité/diplômes : données personnelles, sauvegarde à chiffrer).
- **Mise à jour** : `git pull && docker compose up -d --build` (migrations automatiques au boot).

Cible future **Vercel + Turso** : basculer `adapter-vercel` et pointer `DATABASE_URL` +
`DATABASE_AUTH_TOKEN` vers Turso — aucune modification de la logique applicative (prévoir un
stockage objet pour les documents, aujourd'hui sur disque).
