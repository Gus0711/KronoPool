# KronoPool

Application web **mobile-first** de gestion des plannings d'intervenants (surveillance de piscine).
Un directeur publie des **besoins** (créneaux à pourvoir) ; des intervenants **MNS** / **BNSSA**
**réservent** un poste libre en « premier arrivé, premier servi », sans validation.
Interface **en français**, fuseau **Europe/Paris**.

> Spécifications : [`CDC_planning-piscine_v1.md`](./CDC_planning-piscine_v1.md) (comportement) ·
> [`docs/handoff/`](./docs/handoff/) (design system « 2a Lagon ») · [`docs/PLAN.md`](./docs/PLAN.md) (plan V1).

## Stack

- **SvelteKit** (SSR, Svelte 5) · adapter **Node** (cible future : Vercel, sans réécriture).
- **SQLite via libSQL** + **Drizzle ORM** (local : fichier ; futur : Turso, même code).
- **Auth maison** : sessions en base (token hashé SHA-256), cookie `httpOnly/Secure/SameSite=Lax`,
  expiration glissante · mots de passe **Argon2id** (`@node-rs/argon2`).
- **Zod** sur toutes les entrées serveur · **Tailwind CSS** (tokens « 2a Lagon ») · `lucide-svelte`.

## Démarrage

```bash
npm install
cp .env.example .env          # ajuster les identifiants admin + PUBLIC_DIRECTEUR_TEL
npm run db:generate           # (déjà généré : dossier drizzle/) — régénère depuis le schéma
npm run db:seed               # applique les migrations + crée les 2 comptes admin
npm run db:seed:dev           # (optionnel) données de démo : 2 intervenants + besoins futurs
npm run dev                   # http://localhost:5173
```

Comptes de démo (`db:seed:dev`, mot de passe `motdepasse`) :
`camille@piscine.fr` (MNS) · `bruno@piscine.fr` (BNSSA).

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm run preview` | Build de production (adapter-node) / prévisualisation |
| `npm run check` | Vérification des types (`svelte-check`) |
| `npm run db:generate` | Génère les migrations depuis le schéma Drizzle |
| `npm run db:migrate` | Applique les migrations (drizzle-kit) |
| `npm run db:migrate:apply` | Applique les migrations (runtime, sans drizzle-kit) |
| `npm run db:seed` | Migrations + création des 2 comptes admin |
| `npm run db:seed:dev` | Données de démonstration |
| `npm run db:studio` | Explorateur Drizzle |

## Structure

```
src/
  lib/
    components/            # Design system (AppHeader, CreneauCard, BottomNav, badges, toasts…)
    format.ts             # Formatage FR (dates, heures, durées)
    toast.ts              # File de toasts
    server/
      db/                 # schéma Drizzle, client libSQL, seeds
      auth/               # hash Argon2id, sessions, guards de rôle, rate-limit
      services/           # logique métier (créneaux, réservation atomique, besoins, récap…)
      time.ts             # comparaisons « futur » en Europe/Paris
      validation.ts       # schémas Zod
  hooks.server.ts         # résolution de session + guards de rôle par groupe de routes
  routes/
    login/ · changer-mot-de-passe/ · deconnexion/ · compte/
    (intervenant)/        # creneaux, mes-reservations, mon-recap
    (admin)/              # dashboard, besoins, intervenants, recap, planning
```

## Règles métier clés

- **Éligibilité** : un MNS est aussi BNSSA. Poste BNSSA → BNSSA ou MNS ; poste MNS → MNS uniquement.
  Un intervenant ne voit que les postes libres éligibles à son niveau.
- **Réservation atomique** : `UPDATE poste SET reserved_by=? WHERE id=? AND reserved_by IS NULL`
  + contrôle du nombre de lignes affectées (1 = succès, 0 = déjà pris). Éligibilité + poste futur
  vérifiés avant.
- **Pas d'annulation intervenant** : seul l'admin peut **libérer** un poste (tracé dans `audit_log`).
- **Statut besoin** et **récap d'heures** = calculés (aucune table dédiée).

## Déploiement (Proxmox / Docker)

Au démarrage, le conteneur **applique les migrations** puis **crée les comptes admin**
(idempotent : un admin déjà présent est ignoré). Aucune étape manuelle de seed.

### Option A — docker compose (recommandé)

Sur l'hôte Proxmox (VM ou LXC avec Docker installé) :

```bash
# 1. Récupérer le projet
git clone <votre-repo> kronopool && cd kronopool

# 2. Créer le fichier d'environnement à partir de l'exemple, puis l'éditer
cp .env.example .env
nano .env          # SESSION_SECRET + identifiants ADMIN1/ADMIN2 + PUBLIC_DIRECTEUR_TEL

# 3. Préparer le volume de données et lancer
sudo mkdir -p /srv/kronopool/data
docker compose up -d --build

# 4. Suivre le démarrage (migrations + seed admin)
docker compose logs -f
```

L'app écoute sur `127.0.0.1:<APP_PORT>` (défaut 3000) — c'est ce port que le
Cloudflare Tunnel doit cibler. Changer `APP_PORT` dans `.env` si besoin.

### Option B — docker run

```bash
docker build -t kronopool .
docker run -d --name kronopool --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v /srv/kronopool/data:/data \
  -e DATABASE_URL=file:/data/app.db \
  -e SESSION_SECRET=... \
  -e ADMIN1_EMAIL=... -e ADMIN1_PASSWORD=... -e ADMIN1_NOM=... -e ADMIN1_PRENOM=... \
  -e ADMIN2_EMAIL=... -e ADMIN2_PASSWORD=... -e ADMIN2_NOM=... -e ADMIN2_PRENOM=... \
  -e PUBLIC_DIRECTEUR_TEL="06 XX XX XX XX" \
  kronopool
```

### Exposition & sauvegarde

- **HTTPS** : exposer via **Cloudflare Tunnel** (`cloudflared`) ou un reverse-proxy
  (Nginx Proxy Manager, Caddy, Traefik) sur un sous-domaine. Ne pas exposer le port 3000
  brut sur Internet.
- **Sauvegarde** : copie régulière de `/srv/kronopool/data/app.db` (+ `-wal`/`-shm` si présents).
- **Mise à jour** : `git pull && docker compose up -d --build` (les migrations éventuelles
  s'appliquent automatiquement au redémarrage).

Cible future **Vercel + Turso** : basculer `adapter-vercel` et pointer `DATABASE_URL` +
`DATABASE_AUTH_TOKEN` vers Turso — aucune modification de la logique applicative.
