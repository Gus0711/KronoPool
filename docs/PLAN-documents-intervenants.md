# Plan — Feature « Documents des intervenants »

> Ajout d'une section documents au profil des intervenants (carte d'identité, diplômes, PSE1, RIB…),
> certains marqués « obligatoire ». Consultation/gestion par l'intervenant et par l'admin.

## Décisions retenues

- **Gestion** : intervenant (ses propres docs) **+** admin (docs de n'importe quel intervenant).
- **Types de documents** : **configurables par l'admin** (table dédiée + écran de réglages), avec un flag « obligatoire ».
- **Doc obligatoire manquant** : **non bloquant** → alerte visuelle partout + bandeau de rappel à la connexion.
- **Stockage** : fichiers sur disque dans le volume `data/`, **date d'expiration optionnelle** par document.

---

## 1. Modèle de données (`src/lib/server/db/schema.ts`)

Deux nouvelles tables (le schéma se veut explicitement extensible).

### `document_type` — catalogue configurable par l'admin

| colonne | type | note |
|---|---|---|
| `id` | text PK uuid | |
| `libelle` | text notNull | ex. « Carte d'identité » |
| `obligatoire` | integer(bool) default false | |
| `niveauRequis` | text enum(MNS/BNSSA) **nullable** | *optionnel* : rend le type obligatoire seulement pour un niveau (ex. diplôme MNS). `null` = tous |
| `ordre` | integer default 0 | tri d'affichage |
| `actif` | integer(bool) default true | désactivation sans suppression |
| `createdAt` / `updatedAt` | timestamp | |

### `document` — fichier téléversé rattaché à un intervenant

| colonne | type | note |
|---|---|---|
| `id` | text PK uuid | |
| `userId` | text → user.id **cascade** | propriétaire (intervenant) |
| `typeId` | text → document_type.id **set null** | catégorie ; garde le fichier si le type est supprimé |
| `nomFichier` | text notNull | nom original (affichage/download) |
| `storedName` | text notNull | nom aléatoire sur disque (uuid + ext) — anti path-traversal |
| `mimeType` | text notNull | |
| `taille` | integer notNull | octets |
| `dateExpiration` | text nullable | `YYYY-MM-DD` (convention projet) |
| `uploadedBy` | text → user.id | qui a téléversé (intervenant ou admin) |
| `uploadedAt` | timestamp | |

**Workflow migration** : `npm run db:generate` → commit du `.sql` → `db:migrate:apply` au déploiement.
**Seed** : insérer quelques `document_type` par défaut (Carte d'identité *oblig.*, Diplôme *oblig.*, PSE1 *oblig.*, RIB, Autre) dans `scripts/seed.mjs`.

> **Note sur `dateValiditeTitre` / `dateValiditePse` existants** (service `diplomes.ts`) : on **les garde intacts en V1** pour ne rien casser. À terme la validité pourra dériver de `document.dateExpiration`. Dette assumée, sans migration destructive maintenant.

---

## 2. Stockage disque

- Répertoire `data/documents/<userId>/<storedName>` (même volume persistant que la DB).
- **Aucune URL publique** : les fichiers sont servis uniquement par un endpoint protégé (§4).
- Helper `src/lib/server/storage/documents.ts` : `saveFile`, `deleteFile`, `readFile`, `documentPath` — isolé pour un futur passage vers un stockage objet sans toucher au reste.

---

## 3. Service métier (`src/lib/server/services/documents.ts`)

Style identique à `intervenants.ts` (fonctions async pures Drizzle, vues typées) :

- **Types** : `listerTypes`, `creerType`, `modifierType`, `desactiverType`.
- **Docs** : `listerDocumentsDe(userId)`, `getDocument(id)`, `ajouterDocument(...)`, `supprimerDocument(id)`.
- **Statut de conformité** : `etatConformite(user)` → pour chaque type obligatoire applicable au niveau du user : `{ type, statut: 'present' | 'manquant' | 'expire', document? }`, + un booléen `enAlerte` et un compteur. Réutilise l'esprit de `diplomes.ts` (`ok/bientot/expire/absent`) et le composant `ValiditePill`.

---

## 4. Routes & endpoints

### Espace intervenant — dans `compte/` (partagé, hors préfixe guard)

- `compte/+page.server.ts` : `load` ajoute `documents` + `conformite` ; nouvelles actions `uploadDocument` (multipart) et `supprimerDocument`.
- `compte/documents/[id]/+server.ts` : téléchargement protégé — `requireUser`, vérifie `document.userId === locals.user.id` (ou admin), renvoie le fichier avec `Content-Disposition`.

### Espace admin — sous le préfixe déjà gardé `/intervenants`

- `(admin)/intervenants/[id]/+page.server.ts` : `load` ajoute les documents + conformité de l'intervenant ; actions `uploadDocument` / `supprimerDocument` (admin agit pour le compte du user).
- Réglages des types : nouvelle page `(admin)/documents-types/` (liste + création/édition/désactivation).
  ⚠️ **Nouveau préfixe d'URL** → l'ajouter à `ADMIN_PREFIXES` dans `hooks.server.ts`.
  *(Alternative : l'intégrer au dashboard admin existant pour éviter le nouveau préfixe.)*
- Le téléchargement admin peut réutiliser `compte/documents/[id]` (guard admin-or-owner) ou un endpoint dédié `(admin)/intervenants/[id]/documents/[docId]`.

### Rappel à la connexion (non bloquant)

- Dans `(intervenant)/+layout.server.ts` : calculer `conformite.enAlerte` et le nombre de docs obligatoires manquants, l'exposer au layout.
- Bandeau dismissible en haut de l'espace intervenant (style `card-lagon` / `ValiditePill`) : « Il vous manque N document(s) obligatoire(s) → Compte ». Pas de blocage des réservations.

---

## 5. Validation & sécurité

- **Upload multipart** (1re fois dans le projet) : `await request.formData()`, `form.get('file') as File`, `file.arrayBuffer()`.
- **Validation** (Zod pour les champs texte : `typeId`, `dateExpiration` ; contrôle manuel pour le binaire) :
  - MIME autorisés : `application/pdf`, `image/jpeg`, `image/png` (+ `image/heic` à confirmer).
  - Taille max (ex. **10 Mo**) — refus propre via `fail(400)`.
  - `storedName` = uuid + extension dérivée du MIME (jamais du nom client).
- **Autorisation** : intervenant ↔ uniquement `userId === locals.user.id` ; admin ↔ tout. Vérif **serveur** dans chaque action ET dans l'endpoint de téléchargement (défense en profondeur, cf. `guards.ts`).
- **CSRF** : couvert par la vérif d'origine SvelteKit (`ORIGIN`) déjà en place.
- **Suppression fichier** : supprimer la ligne DB **et** le fichier disque (dans le service, gérer l'échec disque sans laisser d'orphelin en base).

---

## 6. UI (design system « 2a Lagon »)

- **Compte intervenant** : nouvelle carte « Mes documents » — liste par type avec `ValiditePill` (à jour / bientôt / expiré / manquant), bouton upload (input file stylé `cta-sand`), suppression avec `Modal` de confirmation, `EmptyState` si vide. Mobile-first, colonne `max-w-app`.
- **Fiche admin intervenant** : même liste + upload pour le compte de l'intervenant + colonne « conformité » visible dans la liste `(admin)/intervenants/` (pastille d'alerte).
- **Réglages types (admin)** : tableau desktop responsive (libellé, obligatoire, niveau, actif, actions).
- Réutilise `Modal`, `EmptyState`, `Skeleton`, `ToastHost`, `ValiditePill`, `NiveauBadge`.

---

## 7. Ordre d'implémentation

1. Schéma `document_type` + `document` → migration + seed des types par défaut.
2. Helper stockage disque + service `documents.ts` (types, docs, conformité) + tests unitaires (conformité, éligibilité par niveau).
3. Endpoint de téléchargement protégé.
4. Upload/suppression + affichage côté **compte intervenant**.
5. Gestion côté **admin** (fiche intervenant + colonne conformité en liste).
6. Écran **réglages des types** (+ maj `ADMIN_PREFIXES`).
7. Bandeau de rappel à la connexion (layout intervenant).
8. `.env`/docs : documenter le volume `data/documents`, la taille max, les MIME autorisés.

---

## Points à confirmer avant de coder (mineurs)

- **MIME/taille** : PDF + JPEG/PNG + HEIC ? Plafond 10 Mo OK ?
- **Obligatoire par niveau** : garde-t-on la colonne `niveauRequis` sur `document_type` (diplôme MNS obligatoire seulement pour MNS) ou « obligatoire pour tous » suffit en V1 ?
- **Route des réglages types** : route dédiée `/documents-types` (nouveau préfixe guard) — OK, ou l'intégrer au dashboard admin existant ?
- **Un seul fichier par type, ou plusieurs ?** (ex. recto/verso CIN). Hypothèse par défaut : « plusieurs autorisés, le plus récent non expiré fait foi pour la conformité ».
