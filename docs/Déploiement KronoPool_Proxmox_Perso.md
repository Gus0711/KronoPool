# Déploiement KronoPool — runbook (Proxmox perso)

> **Contexte : ce runbook est spécifique à l'infrastructure personnelle de Gus.**
> Il ne s'applique PAS à un déploiement générique ni à Vercel. Il décrit la mise à jour
> de l'app sur le homelab Proxmox perso, avec les particularités de cette archi.

## Où tourne l'app

- **Hôte** : Proxmox perso.
- **Conteneur** : PCT **103** (nom `docker`) — c'est là que tourne Docker et KronoPool.
- **Dossier du projet** : `/opt/stacks/kronopool`
- **Port applicatif** : `APP_PORT=8085` (défini dans `.env`).
- **Domaine public** : `https://piscine-suippes.datagtb.com`
- **Base + fichiers** : bind mount **`/srv/kronopool/data`** sur l'hôte
  → `app.db` + `documents/` (uploads intervenants).

## Accès rapide au bon endroit

Depuis l'hôte Proxmox :

```bash
pct enter 103
cd /opt/stacks/kronopool
```

## Particularité archi À CONNAÎTRE : le tunnel Cloudflare

- `cloudflared` **ne tourne PAS dans le PCT 103** — il tourne sur **une autre machine du réseau**.
- Conséquence : le port de l'app doit être publié sur le **LAN** (`0.0.0.0`), pas sur `127.0.0.1`,
  sinon le tunnel ne peut pas joindre l'app → **erreur 502**.
- La cible du hostname côté Cloudflare est donc l'**IP LAN du PCT** :
  `http://192.168.1.205:8085` (et non `127.0.0.1:8085`).
- Dans `docker-compose.yml`, la ligne de port DOIT rester :
  ```yaml
  - "${APP_PORT:-3000}:3000"
  ```
  (SANS préfixe `127.0.0.1:`). Le commentaire du fichier mentionne « 127.0.0.1 » mais c'est
  trompeur pour cette archi — ignorer le commentaire, garder le binding LAN.

> ⚠️ Piège récurrent : le repo GitHub contient la version `127.0.0.1:...`. Le binding LAN
> local n'est pas commité. Après un `git pull` qui toucherait ce fichier, TOUJOURS revérifier
> le port (voir étape 1). S'il est repassé en `127.0.0.1:`, rouvrir avec le sed de l'étape 1bis.

## Procédure de déploiement standard

### 1. Récupérer le code + VÉRIFIER LE PORT

```bash
cd /opt/stacks/kronopool && git pull && grep -n "APP_PORT" docker-compose.yml
```

- Le pull doit être un `Fast-forward` sans conflit.
- La ligne 11 doit afficher `- "${APP_PORT:-3000}:3000"` (**sans** `127.0.0.1:`).

### 1bis. (SEULEMENT si le port est repassé à 127.0.0.1) rouvrir le LAN

```bash
sed -i 's/"127\.0\.0\.1:\${APP_PORT:-3000}:3000"/"${APP_PORT:-3000}:3000"/' docker-compose.yml
grep -n "APP_PORT" docker-compose.yml
```

### 2. Build + relance + suivi des logs

```bash
docker compose up -d --build && docker compose logs -f
```

Dans les logs, vérifier dans l'ordre :
- `✔ Migrations appliquées.` (applique les migrations Drizzle éventuelles)
- Les seeds éventuels (admins, types de documents…) : « créés » au 1ᵉʳ coup, « ignorés » ensuite (idempotent).
- `Listening on http://0.0.0.0:3000`

Puis `Ctrl+C` pour reprendre la main (**n'arrête pas** le conteneur, grâce à `-d`).

### 3. Vérifier que l'app répond

```bash
docker compose ps                         # PORTS doit montrer 0.0.0.0:8085->3000/tcp
curl -sI http://127.0.0.1:8085/login | head -3   # doit renvoyer 200 ou 303
```

### 4. Tester derrière le domaine

Recharger `https://piscine-suippes.datagtb.com` en **`Ctrl+Shift+R`**
(rafraîchissement forcé, pour éviter le cache CSS/JS après une modif de front).

## Rappels importants

- **⚠️ Notifications push inactives dans ce déploiement** : le bloc `environment:` de
  `docker-compose.yml` ne transmet pas `PUBLIC_VAPID_KEY`, `VAPID_PRIVATE_KEY` ni `VAPID_SUBJECT`
  au conteneur. Même renseignées dans `.env`, les notifications ne partent pas tant que ces trois
  lignes ne sont pas ajoutées au compose (voir `docs/AUDIT.md`, constat M10). Vérification rapide :
  `docker exec kronopool printenv PUBLIC_VAPID_KEY` (vide = push inactif).
- **`.env` n'est pas dans Git** (secrets). Il vit uniquement sur le PCT 103. Un `git pull` ne le
  touche jamais. Ne jamais y mettre de vrais secrets dans un fichier versionné.
- **Le seed admin est idempotent** : modifier `ADMIN*_PASSWORD` dans `.env` puis redéployer
  NE change PAS les mots de passe des comptes déjà en base (« déjà présent — ignoré »).
  Les mots de passe se changent dans l'app, ou en repartant d'une base vierge (voir ci-dessous).
- **Réinitialiser la base** (⚠️ efface TOUTES les données — uniquement en phase de test) :
  la base est un bind mount, donc `docker compose down -v` NE suffit PAS. Il faut :
  ```bash
  docker compose down
  rm -f /srv/kronopool/data/app.db /srv/kronopool/data/app.db-shm /srv/kronopool/data/app.db-wal
  docker compose up -d && docker compose logs -f
  ```
  Au redémarrage, le seed recrée les admins (« ✓ Admin créé »).

## Données à sauvegarder

Tout est dans **`/srv/kronopool/data/`** :
- `app.db` (+ `-shm` / `-wal`) : la base SQLite.
- `documents/` : pièces uploadées par les intervenants (CNI, diplômes, PSE1, RIB…).
  → données personnelles : accès restreint, sauvegarde à traiter avec soin (idéalement chiffrée).

## Changement de domaine (rappel)

Si le domaine public change un jour :
1. Côté Cloudflare : faire pointer le nouveau hostname vers `http://192.168.1.205:8085`.
2. Dans `.env` : `ORIGIN=https://nouveau-domaine.exemple` (schéma `https://`, **pas** de slash final)
   — sinon 403 CSRF sur tous les POST (login, réservations…).
3. `docker compose up -d` (recrée le conteneur avec le nouvel `ORIGIN`).
4. Vérifier : `docker exec kronopool printenv ORIGIN`.

## Amélioration future possible (non faite)

Installer `cloudflared` **directement dans le PCT 103**. Ça permettrait de refermer le port sur
`127.0.0.1` (plus rien exposé sur le LAN) et de viser `http://127.0.0.1:8085` dans le tunnel —
l'archi la plus sûre. Chantier à part, pas nécessaire au fonctionnement actuel.