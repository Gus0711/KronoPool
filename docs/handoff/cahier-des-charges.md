# Cahier des charges — KronoPool (application de gestion des plannings d'intervenants, piscine)

**Version :** 1.0 · **Nom de l'app :** KronoPool

> Ce document est la **spécification fonctionnelle et technique de référence**. Il fait foi
> pour le comportement, les rôles, les règles métier, le modèle de données et la stack.
> Le style visuel est défini séparément dans le `README.md` du handoff et dans
> `reference-creneaux-2a.html` (direction « 2a Lagon »).

---

## 1. Contexte & objectif

Un directeur de piscine doit couvrir des besoins ponctuels en personnel de surveillance
(intervenants extérieurs). Aujourd'hui la gestion est manuelle (téléphone, tableurs).

L'application permet à l'administrateur de **publier ses besoins** (créneaux à pourvoir),
et aux **intervenants extérieurs** de **réserver** un créneau libre correspondant à leur
niveau. Premier arrivé, premier servi.

Objectif V1 : remplacer la coordination manuelle par un outil web simple, mobile-first,
sans dépendance à un service tiers (pas d'envoi de mail/SMS).

---

## 2. Périmètre

### Dans le périmètre (V1)
- Deux rôles : **admin** (directeur + 1 second admin) et **intervenant**.
- L'admin crée et gère les comptes intervenants (pas d'auto-inscription).
- L'admin publie des **besoins** (créneaux) contenant un ou plusieurs **postes** à pourvoir.
- L'intervenant consulte les postes **libres** qu'il est autorisé à prendre et **réserve**.
- Réservation **ferme et immédiate** (premier arrivé, premier servi), **sans validation admin**.
- L'intervenant **ne peut pas annuler** : seul l'admin peut **libérer** un poste.
- Suivi des dates de validité des diplômes/secourisme avec **alertes**.
- Historique des créneaux passés + **récapitulatif d'heures par intervenant** + export.
- Un seul lieu (piscine) — pas de gestion multi-sites.

### Hors périmètre — versions ultérieures
- **V1.1** : duplication / création récurrente de besoins (ex : « tous les mardis 14h-18h »).
- **V1.2** : rémunération / taux horaire par poste (différencié MNS / BNSSA), affichage et
  calcul dans le récap d'heures.
- **Futur** : gestion du **planning du personnel interne** (pas seulement extérieurs) —
  le modèle de données doit rester compatible avec cette extension.

### Explicitement exclu (V1)
- Aucun envoi d'e-mail, SMS ou notification externe.
- Pas de paiement en ligne.
- Pas de récurrence, pas de multi-sites, pas de taux horaire.

---

## 3. Rôles & permissions

| Action | Admin | Intervenant |
|---|:---:|:---:|
| Se connecter | ✅ | ✅ |
| Changer **son** mot de passe | ✅ | ✅ |
| Créer / éditer / désactiver un compte intervenant | ✅ | ❌ |
| Réinitialiser le mot de passe d'un intervenant | ✅ | ❌ |
| Créer / éditer / supprimer un besoin | ✅ | ❌ |
| Voir tous les besoins (libres, pourvus, passés) | ✅ | ❌ |
| Voir qui a réservé chaque poste | ✅ | ❌ |
| **Libérer** un poste réservé (remise à dispo) | ✅ | ❌ |
| Voir les postes **libres** qu'il peut prendre | ❌ | ✅ |
| **Réserver** un poste | ❌ | ✅ |
| Voir **ses** réservations (à venir + passées) | ❌ | ✅ |
| **Annuler** une réservation | ❌ | ❌ |
| Voir le récap d'heures / export | ✅ | ✅ (le sien) |

- **2 comptes admin** au minimum. Les admins ont les mêmes droits.
- Un intervenant qui doit annuler **appelle l'admin par téléphone** ; l'admin libère le poste,
  qui redevient disponible pour tous les intervenants éligibles.

---

## 4. Règles métier

### 4.1 Niveaux et éligibilité
- Deux niveaux : **MNS** et **BNSSA**.
- **Un MNS est nécessairement BNSSA** (le niveau intervenant stocké = qualification la plus haute).
- Règle d'éligibilité à un poste :
  - Poste **BNSSA** → réservable par un intervenant **BNSSA ou MNS**.
  - Poste **MNS** → réservable **uniquement par un MNS**.

### 4.2 Réservation
- **Premier arrivé, premier servi** : dès qu'un poste est réservé, il disparaît des postes libres.
- Réservation **ferme immédiatement**, sans validation admin.
- L'intervenant ne peut réserver **que des postes futurs** (date/heure de début > maintenant).
- Un intervenant ne voit **que les postes libres** éligibles à son niveau (il ne voit pas qui a
  pris les autres postes).
- **Pas de blocage des chevauchements** entre deux réservations d'un même intervenant (choix V1).
- Garde-fou technique minimal : empêcher qu'un même intervenant réserve deux fois le même poste,
  et empêcher la réservation d'un poste déjà pris (voir §9 concurrence).

### 4.3 Besoins & postes
- Un **besoin** = une date + une heure de début + une heure de fin + un commentaire optionnel.
- Un besoin contient **1 à N postes**. Chaque poste a un **niveau requis** (MNS ou BNSSA).
- À la création, l'admin saisit un **nombre de postes MNS** et un **nombre de postes BNSSA** ;
  l'application génère autant de lignes `poste` que nécessaire (ex : 1 MNS + 2 BNSSA → 3 postes).
- Statut d'un besoin (calculé) : `À venir`, `Complet` (tous postes pourvus), `Passé`.
- L'admin peut éditer/supprimer un besoin. Supprimer un besoin avec des réservations doit
  demander une confirmation explicite.

### 4.4 Diplômes & alertes
- Chaque intervenant a des dates de validité :
  - **Validité du titre** (BNSSA ou MNS/CAEPMNS).
  - **Validité secourisme (PSE1)**.
- Le dashboard admin affiche des **alertes** pour tout diplôme **expiré** ou **expirant sous 30 jours**.
- La validité expirée **n'empêche pas** la réservation en V1 (simple alerte), mais l'admin la voit.

### 4.5 Comptes
- L'admin crée le compte avec un **mot de passe initial** qu'il communique de vive voix.
- Le compte est marqué **« mot de passe à changer à la première connexion »** (recommandé, activé par défaut).
- L'intervenant **et** l'admin peuvent modifier le mot de passe.
- Un compte peut être **désactivé** (plus de connexion possible) sans être supprimé — préserve l'historique.

---

## 5. Modèle de données

Base **SQLite** (via libSQL), ORM **Drizzle**. Schéma logique :

### Table `user`
| Champ | Type | Notes |
|---|---|---|
| `id` | text (uuid) / int autoincrement | PK |
| `role` | text | `admin` \| `intervenant` |
| `nom` | text | |
| `prenom` | text | |
| `telephone` | text | |
| `email` | text | stocké, jamais utilisé pour envoi |
| `niveau` | text nullable | `MNS` \| `BNSSA` ; `null` pour un admin |
| `date_validite_titre` | date nullable | validité BNSSA/MNS |
| `date_validite_pse` | date nullable | validité PSE1 |
| `password_hash` | text | Argon2id |
| `must_change_password` | boolean | défaut `true` à la création |
| `actif` | boolean | défaut `true` |
| `created_at` / `updated_at` | datetime | |

### Table `session`
| Champ | Type | Notes |
|---|---|---|
| `id` | text | PK (token de session hashé) |
| `user_id` | FK → user.id | |
| `expires_at` | datetime | |

### Table `besoin`
| Champ | Type | Notes |
|---|---|---|
| `id` | uuid/int | PK |
| `date` | date | |
| `heure_debut` | time | |
| `heure_fin` | time | |
| `commentaire` | text nullable | précisions (ex : bassin sportif) |
| `created_by` | FK → user.id | admin auteur |
| `created_at` / `updated_at` | datetime | |

### Table `poste`
| Champ | Type | Notes |
|---|---|---|
| `id` | uuid/int | PK |
| `besoin_id` | FK → besoin.id | ON DELETE CASCADE |
| `niveau_requis` | text | `MNS` \| `BNSSA` |
| `reserved_by` | FK → user.id nullable | `null` = libre |
| `reserved_at` | datetime nullable | |

> **Récap d'heures** : calculé en sommant `(heure_fin - heure_debut)` des postes dont
> `reserved_by = intervenant` pour des besoins passés. Pas de table dédiée en V1.

> **Extension future (personnel interne)** : ajouter un champ `type_intervenant`
> (`externe` / `interne`) sur `user` sera suffisant ; le reste du modèle ne change pas.

> **Extension V1.2 (taux horaire)** : ajouter `tarif_horaire` sur `poste` (ou une table
> `tarif` par niveau). Prévu, non implémenté.

### Table `audit_log` (optionnel mais recommandé)
Trace les libérations de poste par l'admin : `id`, `poste_id`, `action` (`liberation`),
`ancien_intervenant`, `admin_id`, `created_at`. Utile pour comprendre l'historique.

---

## 6. Écrans & parcours

### 6.1 Commun
- **Page de connexion** : email (ou identifiant) + mot de passe.
- Redirection selon le rôle après connexion.
- Si `must_change_password` → écran forcé de changement de mot de passe.
- **Mon compte** : changer son mot de passe, voir ses infos.

### 6.2 Espace ADMIN
1. **Dashboard** — prochains besoins et taux de remplissage ; postes non pourvus à venir (mis en avant) ; alertes diplômes (expirés / < 30 j).
2. **Créer un besoin** — date, heure début, heure fin, commentaire ; nombre de postes MNS + BNSSA.
3. **Liste des besoins** (onglets À venir / Passés) — statut, remplissage, clic → détail.
4. **Détail besoin** — postes avec niveau + intervenant assigné (ou « libre ») ; bouton **Libérer** par poste réservé (confirmation) ; éditer / supprimer le besoin.
5. **Gestion des intervenants** — liste (nom, niveau, validités, actif/inactif) ; créer / éditer / désactiver ; **réinitialiser le mot de passe**.
6. **Récap d'heures** — période, total par intervenant, **export CSV** (PDF optionnel).
7. **Planning global** — vue liste ou calendrier simple, lecture seule.

### 6.3 Espace INTERVENANT (mobile-first)
1. **Créneaux disponibles** — postes libres futurs éligibles à son niveau (date, heures, niveau, commentaire) ; bouton **Réserver** par poste ; message clair si le poste vient d'être pris (« déjà réservé »).
2. **Mes réservations** (À venir / Passées) — rappel : pour annuler, **contacter le directeur par téléphone** (message + numéro visible).
3. **Mon récap d'heures** (le sien) — total sur période, export CSV.
4. **Mon compte** — changer mot de passe.

---

## 7. Stack technique & architecture

- **Framework** : **SvelteKit** (SSR).
  - Déploiement initial : `@sveltejs/adapter-node` (conteneur Docker sur Proxmox).
  - Cible future : `@sveltejs/adapter-vercel` (bascule sans réécriture applicative).
- **Base de données** : **SQLite via libSQL** + **Drizzle ORM**.
  - Local (Proxmox) : fichier `file:./data/app.db`.
  - Vercel (futur) : **Turso** (URL libSQL distante) — même code Drizzle, changement d'`env` uniquement.
- **Auth** : sessions maison, cookie **httpOnly / Secure / SameSite=Lax**.
  - Hash mot de passe : **Argon2id** (`@node-rs/argon2` ou équivalent).
  - Token de session aléatoire, stocké hashé en base, expiration glissante.
- **Validation** : **Zod** sur toutes les entrées serveur (actions de formulaire).
- **UI** : **Tailwind CSS**, **mobile-first**, responsive PC. Composants sobres. Voir tokens dans le README.
- **Langue de l'interface** : **français**.
- **Fuseau horaire** : Europe/Paris. Attention à la comparaison « poste futur ».

### Structure indicative
```
src/
  lib/server/
    db/            # schéma Drizzle + client libSQL
    auth/          # sessions, hash, guards
    services/      # logique métier (réservation atomique, éligibilité, récap heures)
  routes/
    login/
    (admin)/       # groupe protégé rôle admin
      dashboard/
      besoins/
      intervenants/
      recap/
    (intervenant)/ # groupe protégé rôle intervenant
      creneaux/
      mes-reservations/
      mon-recap/
    compte/
```

---

## 8. Sécurité & auth

- Toutes les routes hors `/login` requièrent une session valide.
- **Guards par rôle** via `hooks.server.ts` + layouts de groupe : un intervenant ne peut
  atteindre aucune route ou action admin (vérification **côté serveur**, pas seulement UI).
- Mot de passe : longueur minimale 8, hash Argon2id, jamais loggé ni renvoyé.
- Protection **CSRF** sur les actions de formulaire (natif SvelteKit form actions + vérif origin).
- Un compte `actif = false` ne peut pas se connecter et ses sessions existantes sont invalidées.
- Rate-limiting simple sur `/login` (ex : n tentatives / IP / minute) — recommandé.

---

## 9. Gestion de la concurrence (réservation)

Point critique du « premier arrivé, premier servi ». La réservation doit être **atomique** :

```sql
UPDATE poste
SET reserved_by = :userId, reserved_at = :now
WHERE id = :posteId
  AND reserved_by IS NULL;
```

- Exécuter dans une transaction, puis vérifier le **nombre de lignes affectées** :
  - `1` → réservation réussie.
  - `0` → poste déjà pris (ou inexistant) → message « ce créneau vient d'être réservé ».
- Vérifier **avant** l'UPDATE : l'intervenant est éligible (niveau) et le poste est **futur**.
- SQLite sérialise les écritures, ce qui rend ce schéma sûr sans verrou explicite ;
  garder malgré tout la clause `WHERE reserved_by IS NULL` comme garde-fou.

---

## 10. Déploiement

### Initial — Proxmox (datagtb.com)
- Build `adapter-node`, image **Docker** (Node LTS).
- Volume monté pour le fichier SQLite (`/data/app.db`) — **persistant** et **sauvegardé**.
- Exposition via **Cloudflare Tunnel** sur un sous-domaine (ex : `piscine.datagtb.com`).
- Variables d'environnement : `DATABASE_URL=file:/data/app.db`, secret de session, etc.
- Script de **seed** créant les 2 comptes admin initiaux (identifiants fournis par variables d'env).
- Sauvegarde : copie régulière du fichier `.db` (ou `sqlite3 .backup`).

### Futur — Vercel
- Basculer sur `adapter-vercel`.
- `DATABASE_URL` → URL **Turso** + token.
- Aucune modification de la logique applicative attendue.

---

## 11. Roadmap

| Version | Contenu |
|---|---|
| **V1** | Périmètre du présent document. |
| **V1.1** | Duplication de besoins + création récurrente (hebdomadaire, plages de dates). |
| **V1.2** | Taux horaire / rémunération par poste (MNS ≠ BNSSA), calcul dans le récap. |
| **Futur** | Gestion du personnel **interne** dans le même planning (champ `type_intervenant`). |

---

## 12. Critères d'acceptation (V1)

- [ ] Un admin peut créer un intervenant, définir son niveau et son mot de passe initial.
- [ ] À sa première connexion, l'intervenant est forcé de changer son mot de passe.
- [ ] Un admin crée un besoin « 1 MNS + 2 BNSSA » → 3 postes sont générés.
- [ ] Un BNSSA voit et peut réserver un poste BNSSA, mais **ne voit pas** les postes MNS.
- [ ] Un MNS voit et peut réserver les postes MNS **et** BNSSA.
- [ ] Deux intervenants qui réservent le même poste « en même temps » : un seul réussit,
      l'autre reçoit un message « déjà réservé ».
- [ ] Un intervenant ne voit aucun bouton/route d'annulation ; le message « contacter le
      directeur » est affiché.
- [ ] L'admin peut libérer un poste réservé → il redevient disponible pour les éligibles.
- [ ] Un intervenant ne peut pas réserver un poste dont l'heure de début est passée.
- [ ] Le dashboard admin affiche les diplômes expirés / expirant sous 30 jours.
- [ ] Le récap d'heures par intervenant sur une période est correct et exportable en CSV.
- [ ] Un intervenant désactivé ne peut plus se connecter.
- [ ] Un intervenant ne peut accéder à aucune route/action admin (vérifié côté serveur).
- [ ] L'app est utilisable confortablement sur mobile et sur PC.
