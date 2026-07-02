# Handoff : KronoPool — application de gestion des plannings d'intervenants (piscine)

> **Note (juillet 2026)** : ce handoff est le document de design **d'origine** (« le projet part
> de zéro » ne s'applique plus — la V1 est livrée). Il reste la référence pour les tokens et le
> style. Le design implémenté l'enrichit (« Lagon vivant » : vagues animées, jauges d'eau) et
> l'écran « Mon compte » comporte désormais la carte documents et le toggle notifications push.
> État réel du code : [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## Vue d'ensemble

KronoPool est une application web **mobile-first** (SvelteKit + SQLite/Drizzle) qui permet à
un directeur de piscine de publier des besoins en personnel de surveillance et aux intervenants
extérieurs (MNS / BNSSA) de réserver des créneaux libres en « premier arrivé, premier servi ».

Ce dossier contient :
- **`cahier-des-charges.md`** — la **spécification fonctionnelle et technique complète** (rôles,
  règles métier, modèle de données Drizzle, sécurité, concurrence, déploiement, critères
  d'acceptation). C'est la source de vérité pour le **comportement**.
- **`reference-creneaux-2a.html`** — la **maquette visuelle** de l'écran cœur intervenant
  « Créneaux disponibles », dans la direction retenue **« 2a Lagon »**. C'est la source de vérité
  pour le **style** (couleurs, typos, tailles, composants).
- **`README.md`** (ce fichier) — le lien entre les deux : design system, tokens, description
  écran par écran de l'espace intervenant + écrans communs.

## À propos des fichiers de design

Le fichier `reference-creneaux-2a.html` est une **référence de design créée en HTML** : un
prototype montrant l'apparence et l'intention, **pas du code de production à copier tel quel**.
La tâche consiste à **recréer ce design dans le codebase cible** (SvelteKit + Tailwind, tel que
défini au §7 du cahier des charges) en suivant les patterns du framework — et non à livrer le
HTML directement. Le HTML utilise des classes/styles ad hoc uniquement pour la démonstration ;
en production, traduisez-les en composants Svelte + utilitaires Tailwind.

Le projet part de zéro : choisissez **SvelteKit** comme indiqué dans le cahier des charges.

## Fidélité

**Haute fidélité (hifi)** pour l'écran « Créneaux disponibles » : couleurs, typographies,
espacements, arrondis et ombres sont **définitifs**. Recréez-le au pixel près avec Tailwind.

Les **autres écrans de l'espace intervenant et les écrans communs** ne sont pas encore
maquettés individuellement : ils sont **spécifiés ci-dessous** (structure + comportement) et
doivent être construits en **appliquant le même design system** (tokens ci-dessous). Restez
cohérent avec l'écran « Créneaux » : même en-tête dégradé lagon, mêmes cartes, mêmes boutons.

> Portée de ce handoff : **espace INTERVENANT (mobile-first) + écrans communs**. L'espace ADMIN
> est spécifié fonctionnellement dans le cahier des charges (§6.2) mais **n'est pas maquetté** ;
> à construire avec le même design system, en layout desktop responsive.

---

## Design system — direction « 2a Lagon »

### Couleurs

| Rôle | Hex | Usage |
|---|---|---|
| Fond d'écran | `#eaf3f5` | fond général de l'app (mobile) |
| En-tête (dégradé) | `linear-gradient(155deg, #155e75 0%, #0c4a5e 55%, #082f3b 100%)` | bandeau haut de chaque écran |
| Teal marque | `#155e75` | wordmark, titres de section (jours), icône nav active, badge BNSSA (texte) |
| Teal foncé | `#0c4a5e` / `#082f3b` | fin du dégradé |
| Texte principal | `#0b2a33` | titres, heures |
| Texte secondaire | `#5a747b` | sous-titres, commentaires de créneau |
| **Accent sable (CTA)** | `#e0b676` | boutons d'action, filtre actif, badge MNS (fond), bordure avatar |
| Texte sur sable | `#3a2a10` | libellé des boutons/chips sable |
| Carte — fond | `#ffffff` | cartes de créneau |
| Carte — bordure | `#d7e6e9` | 1px |
| Badge BNSSA | fond `#dceef1`, texte `#155e75` | pastille niveau |
| Badge MNS | fond `#e0b676`, texte `#0b2a33` | pastille niveau |
| Nav inactive | `#9db4b9` | icônes/labels non sélectionnés |
| Chip filtre inactif (sur en-tête) | fond `rgba(255,255,255,.14)`, texte `#fff` | |

**Sémantique à ajouter** (non présente dans la maquette, à dériver du même registre) :
- Succès (réservation confirmée) : teal `#155e75`.
- Danger / erreur (« déjà réservé », validité expirée) : `#b91c1c` sur fond `#fee2e2`.
- Alerte / bientôt expiré (< 30 j) : sable foncé `#b8862f` sur fond `#fdf1dd`.

### Typographie

- **Display / titres** : **Bricolage Grotesque** (Google Fonts), poids 600–700.
  - H1 écran : 27px / 700 / letter-spacing -0.02em (blanc sur en-tête).
  - Heure de créneau : 19px / 700.
  - Titre de jour : 14px / 600, couleur `#155e75`.
  - Wordmark « KronoPool » : 13px / 700, letter-spacing 0.02em.
- **Corps** : **Figtree** (Google Fonts), poids 400–700.
  - Sous-titre créneau : 13px / 400, couleur `#5a747b`.
  - Salutation : 12.5px / 500.
  - Bouton CTA : 14.5px / 700.
  - Badge niveau : 11px / 700.
  - Chip filtre : 12.5px / 600–700.
  - Label nav : 10px / 600.

Import : `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Figtree:wght@400;500;600;700&display=swap`

### Rayons, ombres, espacements

- Rayon carte : **16px** · bouton CTA : **12px** · chip/badge : **20px** (pilule) · avatar : cercle.
- Ombre carte : `0 6px 18px -12px rgba(11,42,51,.4)`.
- Ombre bouton CTA : `0 6px 16px -8px rgba(224,182,118,.9)`.
- Ombre barre nav : `0 -6px 20px -10px rgba(11,42,51,.3)`.
- Padding en-tête : `6px 20px 30px` (avec vague décorative en bas).
- Padding zone scroll : `6px 20px 20px`.
- Gap entre cartes : 12px · padding interne carte : 16px.
- Hauteurs tactiles : boutons ≥ 44px (CTA à `13px` de padding vertical ≈ 46px).

### Éléments décoratifs

- **Vague** : SVG `<path d="M0 20 Q60 4 120 20 T240 20 T366 20 V40 H0 Z">` rempli de la couleur
  de fond d'écran (`#eaf3f5`), positionné en bas de l'en-tête pour l'effet « ligne d'eau ».
- **Barre de statut** simulée (heure + réseau/batterie) : uniquement pour la maquette téléphone,
  **à supprimer** en production (le navigateur/OS l'affiche).
- **Icônes** : jeu de traits fins (stroke ~1.9px), style « lucide/feather ». En production,
  utilisez une lib d'icônes cohérente (ex : `lucide-svelte`). Icônes nav : calendrier (Créneaux),
  marque-page (Réservations), horloge (Récap), personne (Compte).

---

## Écrans — espace INTERVENANT (mobile-first)

Chaque écran partage la même ossature : **barre de statut** (maquette) → **en-tête lagon**
(wordmark + salutation + avatar initiales à droite, éventuel titre H1, éventuels filtres) →
**zone scrollable** → **barre de navigation basse** (4 onglets fixes). Fond `#eaf3f5`.

### 1. Créneaux disponibles  *(maquetté — hifi — voir `reference-creneaux-2a.html`)*

- **But** : l'intervenant voit les postes **libres, futurs, éligibles à son niveau** et en réserve un.
- **En-tête** : wordmark « KronoPool », « Bonjour {prénom} », avatar (initiales, bordure sable),
  H1 « Créneaux à réserver », rangée de **chips filtre** : `Tous` (actif = sable) · `MNS` · `BNSSA`.
- **Liste** : groupée par **jour** (titre de jour teal). Chaque créneau = **carte** blanche :
  - Ligne haute : **heure** `HH:MM – HH:MM` (Bricolage 19/700) à gauche ; **badge niveau** à droite.
  - Sous-titre : commentaire du besoin (ex. « Bassin sportif · renfort matin »), gris.
  - **Bouton** pleine largeur sable « Réserver ce créneau ».
- **Règle d'affichage (cf. §4.1)** : un BNSSA ne voit **que** les postes BNSSA ; un MNS voit MNS **et** BNSSA.
  Le filtre par niveau ne s'applique qu'aux niveaux visibles pour l'utilisateur.
- **Interaction réservation** : au clic, appel serveur atomique (§9 du cahier). 
  - Succès → la carte disparaît de la liste (ou passe en état « Réservé ✓ » puis retrait), toast succès teal.
  - Échec « déjà pris » (0 ligne affectée) → toast/inline erreur rouge « Ce créneau vient d'être réservé »,
    et la carte est retirée de la liste.
- **État vide** : si aucun créneau éligible → message centré doux (« Aucun créneau disponible pour le moment »).

### 2. Mes réservations

- **But** : consulter ses réservations, à venir et passées. **Aucune annulation possible.**
- **Structure** : en-tête lagon (H1 « Mes réservations »), **deux onglets/segments** : `À venir` / `Passées`.
- **Cartes** identiques au style « Créneaux » (heure + badge niveau + commentaire + jour), **sans bouton Réserver**.
  À la place, une pastille d'état discrète (« Confirmé »).
- **Bandeau d'information permanent** (haut de l'onglet « À venir »), couleur alerte sable :
  > « Pour annuler une réservation, contactez le directeur par téléphone : **06 XX XX XX XX** ».
  Le numéro est un lien `tel:`. **Ne pas** proposer de bouton « Annuler » (cf. §3, §critères).
- Onglet « Passées » : cartes en teinte atténuée, non actionnables.

### 3. Mon récap d'heures

- **But** : l'intervenant voit **son** total d'heures sur une période et l'exporte.
- **Structure** : en-tête lagon (H1 « Mon récap »), **sélecteur de période** (deux champs date début/fin,
  style champ arrondi bordure `#d7e6e9`), un **grand nombre total** mis en avant (Bricolage, teal),
  puis la **liste détaillée** des créneaux comptés (jour, heures, durée).
- **Bouton** « Exporter en CSV » (style CTA sable). Calcul = somme `(heure_fin - heure_debut)` des postes
  `reserved_by = moi` sur des besoins passés dans la période (cf. cahier §5).

### 4. Mon compte

- **But** : voir ses infos et **changer son mot de passe**.
- **Structure** : en-tête lagon (H1 « Mon compte »), bloc infos en lecture seule
  (nom, prénom, niveau — badge, téléphone, email, **validités titre & PSE1** avec pastille d'alerte
  si expiré / < 30 j), puis **formulaire de changement de mot de passe** (mot de passe actuel,
  nouveau, confirmation ; min. 8 caractères). Bouton CTA sable « Enregistrer ». Lien « Se déconnecter ».

---

## Écrans communs

### A. Connexion (`/login`)

- Écran **sans** barre de navigation basse. Fond `#eaf3f5`, **en-tête lagon plein** ou logo centré
  sur bandeau dégradé en haut, puis carte blanche centrée contenant le formulaire.
- Champs : **email (ou identifiant)** + **mot de passe**. Bouton CTA sable pleine largeur « Se connecter ».
- Message d'erreur d'identifiants en rouge (`#b91c1c` / `#fee2e2`), sous les champs.
- Après succès : redirection selon `role` (admin → dashboard ; intervenant → créneaux).
  Si `must_change_password` → redirection forcée vers l'écran B.

### B. Changement de mot de passe forcé (première connexion)

- Déclenché quand `must_change_password = true`. **Bloquant** : aucune autre route accessible tant que
  le mot de passe n'est pas changé.
- En-tête lagon avec titre « Choisissez votre mot de passe » + court texte explicatif
  (« Pour votre première connexion, définissez un nouveau mot de passe »).
- Champs : nouveau mot de passe + confirmation (min. 8). Bouton CTA sable « Valider ».
- À la validation → `must_change_password = false`, redirection vers l'espace du rôle.

---

## Interactions & comportement (transverse)

- **Navigation basse** : 4 onglets fixes (Créneaux · Réservations · Récap · Compte). Onglet actif en teal
  `#155e75`, inactifs `#9db4b9`. Persiste en bas d'écran.
- **Filtres/segments** : sélection unique, l'actif prend le style sable (chips) ou teal (segments).
- **Toasts** : succès (teal) / erreur (rouge). Apparition douce ~200ms, auto-dismiss ~3s.
- **Transitions** : discrètes. Pas d'animation d'entrée obligatoire sur les cartes (la maquette
  initiale en avait une qui posait problème — préférez un rendu immédiat, ou un léger fade Svelte
  `transition:fade` de 150ms max).
- **Responsive PC** : l'espace intervenant reste étroit (colonne centrée max ~480px) même sur grand écran ;
  l'espace admin (hors périmètre maquette) est en layout desktop pleine largeur.
- **Fuseau** : Europe/Paris pour toute comparaison « futur » (cf. §4.2, §9).

## État & données

Voir le cahier des charges §5 (modèle Drizzle) et §9 (réservation atomique). Points clés côté écran :
- **Créneaux** : liste dérivée côté serveur = postes `reserved_by IS NULL`, `besoin.date+heure_debut > now`,
  `niveau_requis` compatible avec le niveau de l'utilisateur.
- **Réservation** : `UPDATE ... WHERE reserved_by IS NULL` en transaction ; 1 ligne = succès, 0 = « déjà pris ».
- **Mes réservations** : postes `reserved_by = moi`, séparés À venir / Passées par date.
- **Récap** : agrégat d'heures sur période (pas de table dédiée).
- Toute entrée serveur validée via **Zod** ; guards de rôle **côté serveur** (§8).

## Assets

- **Polices** : Bricolage Grotesque + Figtree (Google Fonts, import ci-dessus). Aucune font propriétaire.
- **Icônes** : SVG inline dans la maquette (calendrier, marque-page, horloge, personne, réseau, batterie).
  Remplacer par une lib cohérente en production (ex. `lucide-svelte`).
- **Logo** : pas de logo image — wordmark texte « KronoPool » en Bricolage Grotesque.
- Aucune image bitmap requise pour l'espace intervenant.

## Fichiers de ce dossier

- `cahier-des-charges.md` — spécification fonctionnelle & technique de référence.
- `reference-creneaux-2a.html` — maquette hifi de l'écran « Créneaux disponibles » (ouvrir dans un navigateur).
- `README.md` — ce document.
