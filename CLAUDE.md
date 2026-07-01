# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

**KronoPool** — application web **mobile-first** de gestion des plannings d'intervenants (surveillance de piscine). Un directeur publie des **besoins** (créneaux à pourvoir) ; des intervenants extérieurs (**MNS** / **BNSSA**) **réservent** un poste libre en « premier arrivé, premier servi », sans validation. Interface **en français**, fuseau **Europe/Paris**.

**État actuel : projet greenfield.** Le code n'est pas encore échafaudé — seules les specs existent. Le premier travail est de scaffolder SvelteKit selon la stack ci-dessous.

## Documents de référence (source de vérité)

Avant toute implémentation, lire :

- **`CDC_planning-piscine_v1.md`** (racine) — cahier des charges : rôles, permissions, règles métier, modèle de données, sécurité, concurrence, déploiement, critères d'acceptation V1. **Fait foi pour le comportement.**
- **`docs/handoff/README.md`** — design system « 2a Lagon » : tokens couleurs, typo, description écran par écran de l'espace intervenant + écrans communs. **Fait foi pour le style.**
- **`docs/handoff/reference-creneaux-2a.html`** — maquette **hifi** de l'écran « Créneaux disponibles ». À recréer **au pixel près** en Svelte + Tailwind (ne pas copier le HTML tel quel). Ouvrir dans un navigateur pour la voir.
- **`docs/PLAN.md`** — plan d'implémentation V1 phasé (scaffolding → DB → auth → intervenant → admin → déploiement). Fil conducteur de construction.

Portée maquettée : **espace intervenant + écrans communs** (haute fidélité). L'**espace admin** est spécifié fonctionnellement (CDC §6.2) mais **non maquetté** — le construire avec le même design system, en layout desktop responsive.

## Stack

- **SvelteKit** (SSR). Adapter initial : `@sveltejs/adapter-node` (Docker/Proxmox). Cible future : `@sveltejs/adapter-vercel` — ne pas coder de dépendance à l'adapter.
- **SQLite via libSQL** + **Drizzle ORM**. Local : `DATABASE_URL=file:./data/app.db`. Futur : Turso (URL distante), **même code Drizzle**, seul l'env change.
- **Auth maison** : sessions en base (token aléatoire stocké **hashé**), cookie `httpOnly / Secure / SameSite=Lax`, expiration glissante. Hash mot de passe **Argon2id** (`@node-rs/argon2`).
- **Zod** sur **toutes** les entrées serveur (form actions).
- **Tailwind CSS**, mobile-first. Icônes : `lucide-svelte`. Polices Google : Bricolage Grotesque (titres) + Figtree (corps).

## Structure cible (CDC §7)

```
src/
  lib/server/
    db/            # schéma Drizzle + client libSQL
    auth/          # sessions, hash, guards de rôle
    services/      # logique métier (réservation atomique, éligibilité, récap heures)
  routes/
    login/
    (admin)/       # groupe protégé rôle admin — dashboard, besoins, intervenants, recap
    (intervenant)/ # groupe protégé rôle intervenant — creneaux, mes-reservations, mon-recap
    compte/
```

## Règles métier critiques (ne pas se tromper)

Ces règles se recoupent entre plusieurs fichiers (schéma, services, guards, UI) — les traiter comme un tout.

- **Éligibilité par niveau** : un MNS est *aussi* BNSSA. Poste **BNSSA** → réservable par BNSSA **ou** MNS ; poste **MNS** → **uniquement** MNS. Un intervenant ne voit **que** les postes libres éligibles à son niveau (un BNSSA ne voit jamais les postes MNS).
- **Réservation atomique** (point critique, CDC §9) : `UPDATE poste SET reserved_by=?, reserved_at=? WHERE id=? AND reserved_by IS NULL`, dans une transaction, puis **vérifier le nombre de lignes affectées** : `1` = succès, `0` = « déjà réservé ». Toujours garder la clause `WHERE reserved_by IS NULL`. Vérifier **avant** l'UPDATE : éligibilité niveau + poste **futur** (`date+heure_debut > now` en Europe/Paris).
- **Pas d'annulation intervenant** : aucun bouton/route/action d'annulation côté intervenant. Seul l'**admin** peut **libérer** un poste. Afficher le message « contacter le directeur par téléphone ».
- **Génération de postes** : à la création d'un besoin, l'admin saisit un nombre de MNS + un nombre de BNSSA → générer autant de lignes `poste` (ex : 1 MNS + 2 BNSSA = 3 postes). Suppression d'un besoin = `ON DELETE CASCADE` sur les postes, avec confirmation explicite si des réservations existent.
- **Statut besoin** = **calculé** (`À venir` / `Complet` / `Passé`), pas stocké. **Récap d'heures** = agrégat `SUM(heure_fin - heure_debut)` des postes `reserved_by = user` sur besoins passés — **pas de table dédiée**.
- **Extensibilité modèle** : ne pas casser la compatibilité avec les évolutions prévues — personnel interne (futur champ `type_intervenant` sur `user`), taux horaire (futur `tarif_horaire` sur `poste`). Ne pas les implémenter en V1.

## Sécurité (côté serveur, pas seulement UI)

- Toutes les routes hors `/login` exigent une session valide. **Guards de rôle via `hooks.server.ts` + layouts de groupe** : un intervenant ne doit atteindre **aucune** route ni action admin — vérification **serveur**.
- `must_change_password = true` (défaut à la création) → écran de changement **bloquant** avant tout accès.
- Compte `actif = false` : connexion refusée **et** sessions existantes invalidées.
- Mot de passe : min. 8 caractères, jamais loggé ni renvoyé. CSRF via form actions natives + vérif origin. Rate-limiting sur `/login`.
- Seed créant **2 comptes admin** initiaux (identifiants via variables d'env).

## Design system « 2a Lagon » (tokens)

Détail complet dans `docs/handoff/README.md`. Essentiel : fond app `#eaf3f5` ; en-tête dégradé `linear-gradient(155deg,#155e75,#0c4a5e,#082f3b)` avec « vague » SVG en bas ; accent sable CTA `#e0b676` (texte `#3a2a10`) ; teal marque `#155e75` ; cartes blanches rayon 16px bordure `#d7e6e9` ; badge BNSSA (fond `#dceef1`/texte teal), badge MNS (fond sable/texte `#0b2a33`). Espace intervenant : colonne centrée **max ~480px** même sur grand écran ; nav basse à 4 onglets (Créneaux · Réservations · Récap · Compte).

## Commandes

Le projet n'étant pas encore échafaudé, ces commandes seront disponibles une fois SvelteKit + Drizzle installés (adapter selon le gestionnaire de paquets choisi — `npm` par défaut) :

```bash
npm run dev            # serveur de dev
npm run build          # build de production (adapter-node)
npm run preview        # prévisualiser le build
npm run check          # svelte-check (types)
npx drizzle-kit generate   # générer les migrations depuis le schéma
npx drizzle-kit migrate    # appliquer les migrations
```

Vérifier `package.json` une fois créé pour les scripts réels (lint, test, seed).
