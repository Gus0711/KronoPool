# Plan d'implémentation — KronoPool V1

Fil conducteur de construction. Source de vérité comportement : `CDC_planning-piscine_v1.md`.
Source de vérité style : `docs/handoff/`. Découpage en phases livrables et vérifiables.

Environnement de test : **Windows**, gestionnaire de paquets **npm**.

---

## Phase 0 — Scaffolding & socle

- `npm create svelte@latest` (Skeleton, TypeScript) à la racine.
- Ajouter : Tailwind CSS, `drizzle-orm` + `drizzle-kit` + `@libsql/client`, `@node-rs/argon2`, `zod`, `lucide-svelte`, `@sveltejs/adapter-node`.
- Configurer Tailwind avec les **tokens « 2a Lagon »** (couleurs, rayons, ombres) dans `tailwind.config` ; importer les polices Bricolage Grotesque + Figtree.
- Arborescence CDC §7 : `src/lib/server/{db,auth,services}`, groupes de routes `(admin)` / `(intervenant)`.
- `.env.example` (`DATABASE_URL=file:./data/app.db`, `SESSION_SECRET`, identifiants seed admin) ; `data/` gitignoré.
- **Livrable** : `npm run dev` démarre une page vide stylée.

## Phase 1 — Base de données (Drizzle)

- Schéma des tables CDC §5 : `user`, `session`, `besoin`, `poste` (FK `besoin_id` **ON DELETE CASCADE**), `audit_log`.
- Client libSQL + `drizzle.config.ts` ; `drizzle-kit generate` + `migrate`.
- Script de **seed** : crée les **2 comptes admin** (identifiants via env, `must_change_password` selon besoin).
- **Livrable** : base créée, migrations appliquées, admins seedés.

## Phase 2 — Auth & sécurité (transverse, à faire tôt)

- `lib/server/auth` : hash Argon2id, création/validation de session (token aléatoire stocké **hashé**, expiration glissante), cookie `httpOnly/Secure/SameSite=Lax`.
- `hooks.server.ts` : résolution de session → `event.locals.user` ; **guards de rôle** par groupe de routes (côté serveur).
- Règles : route hors `/login` = session requise ; `must_change_password` → écran bloquant ; compte `actif=false` = connexion refusée + sessions invalidées ; rate-limiting `/login`.
- Écrans communs : `/login`, changement de mot de passe forcé, `/compte`.
- **Livrable / critères** : un intervenant ne peut atteindre aucune route/action admin (vérifié serveur) ; 1ʳᵉ connexion force le changement de mot de passe ; compte désactivé bloqué.

## Phase 3 — Espace intervenant (maquetté, hifi)

Priorité car c'est la partie à haute fidélité. Colonne centrée max ~480px, nav basse 4 onglets.

- **Créneaux disponibles** — recréer `reference-creneaux-2a.html` au pixel près. Liste serveur = postes `reserved_by IS NULL`, `besoin.date+heure_debut > now` (Europe/Paris), niveau compatible. Filtres Tous/MNS/BNSSA (uniquement niveaux visibles). Réservation via `lib/server/services` : **UPDATE atomique** `WHERE reserved_by IS NULL` + contrôle lignes affectées (1=succès toast teal, 0=« déjà réservé » toast rouge + retrait carte).
- **Mes réservations** — À venir / Passées, style cartes identique, **aucun bouton annuler** ; bandeau « contacter le directeur » avec lien `tel:`.
- **Mon récap** — sélecteur période, total heures (agrégat, pas de table), export CSV.
- **Livrable / critères** : éligibilité BNSSA/MNS respectée à l'affichage ; concurrence gérée (un seul gagne) ; poste passé non réservable ; aucun chemin d'annulation intervenant.

## Phase 4 — Espace admin (non maquetté, même design system, desktop responsive)

- **Dashboard** : prochains besoins + taux de remplissage, postes non pourvus à venir, **alertes diplômes** (expirés / < 30 j).
- **Créer un besoin** : date/heures/commentaire + nb MNS + nb BNSSA → génération des lignes `poste`.
- **Liste besoins** (À venir/Passés) + **détail** : postes + intervenant assigné, bouton **Libérer** (confirmation, → `audit_log`), éditer/supprimer (confirmation si réservations).
- **Gestion intervenants** : CRUD, niveau, validités, activer/désactiver, réinitialiser mot de passe.
- **Récap d'heures** global par intervalle + export CSV. **Planning global** lecture seule.
- **Livrable / critères** : génération correcte des postes ; libération remet le poste dispo aux éligibles ; alertes diplômes affichées.

## Phase 5 — Validation & déploiement

- Zod sur **toutes** les form actions ; revue des guards ; tests (Vitest sur services : éligibilité, atomicité, récap ; Playwright sur parcours clés).
- Passe complète sur les **critères d'acceptation CDC §12**.
- Dockerfile (`adapter-node`, Node LTS), volume `/data/app.db`, exposition Cloudflare Tunnel. (Bascule Vercel/Turso = plus tard, sans réécriture.)

---

## Points de vigilance récurrents

- **Fuseau Europe/Paris** pour tout « futur » (affichage créneaux + garde-fou réservation).
- **Atomicité réservation** : toujours `WHERE reserved_by IS NULL` + vérif lignes affectées.
- **Guards côté serveur**, jamais seulement UI.
- **Extensibilité** : ne pas bloquer `type_intervenant` (perso interne) ni `tarif_horaire` (V1.2).
- Recréer le design en **composants Svelte + Tailwind**, ne pas copier le HTML de la maquette.
