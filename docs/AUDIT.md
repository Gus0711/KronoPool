# Audit KronoPool — sécurité, robustesse, performance

> **Date** : 2 juillet 2026 · **Périmètre** : l'intégralité du dépôt (code applicatif, schéma DB,
> migrations, Docker/déploiement, dépendances npm, documentation).
> **Méthode** : revue de code exhaustive (auth, routes, services, push/PWA, infra) + `npm audit`.
> **Aucun fichier de code n'a été modifié** : ce rapport diagnostique, les corrections restent à faire.

Légende : 🔴 Critique · 🟠 Majeur · 🟡 Mineur · 🔵 Suggestion

---

## Synthèse

| Sévérité | Nombre | Dominante |
|---|---|---|
| 🔴 Critique | 1 | Rate-limiting login inopérant derrière le tunnel |
| 🟠 Majeur | 11 | SSRF push, hijack d'abonnement, MIME non vérifié, course double-poste, CSV, headers HTTP, push inertes en prod, index manquants |
| 🟡 Mineur | 17 | Durcissements (oracle 403/404, nosniff, Zod, purge sessions, Docker…) |
| 🔵 Suggestion | 9 | Traçabilité, ergonomie notifications, optimisations |

Le socle est **sain** : auth solide (Argon2id OWASP, sessions hashées, guards serveur en double
couche), réservation réellement atomique, pas de path traversal, pas de fuite de `passwordHash`,
service worker sans cache de données authentifiées. Les problèmes sont des angles morts de
durcissement et deux écarts config/déploiement, pas des défauts d'architecture.

---

## 🔴 Critique

### C1 — Rate-limiting du login inopérant derrière le Cloudflare Tunnel (et DoS global trivial)

- **Fichiers** : `src/routes/login/+page.server.ts:24` (`const key = getClientAddress()`),
  `src/lib/server/auth/rate-limit.ts:13-14` (`MAX_ATTEMPTS = 10` / fenêtre 60 s),
  `docker-compose.yml` + `Dockerfile` (aucune variable `ADDRESS_HEADER` / `XFF_DEPTH`).
- **Problème** : avec `adapter-node`, `getClientAddress()` renvoie l'IP du **socket TCP entrant**
  tant que `ADDRESS_HEADER` n'est pas définie. En production, toutes les requêtes arrivent via
  `cloudflared` (sur une autre machine du LAN) : **tous les visiteurs partagent la même IP**, donc
  le même bucket de rate-limit. Cloudflare envoie pourtant `CF-Connecting-IP`, que rien ne consomme.
- **Risque concret** :
  1. N'importe qui peut poster 10 tentatives de connexion par minute et **verrouiller le login de
     tous les utilisateurs** (déni de service sur l'authentification, sans compte).
  2. La protection anti-brute-force par attaquant individuel, exigée par le CDC §8, est de fait
     absente (tout le trafic est agrégé dans un seul compteur).
- **Correction recommandée** : définir dans l'environnement du conteneur :
  ```yaml
  # docker-compose.yml → environment:
  ADDRESS_HEADER: CF-Connecting-IP
  ```
  ⚠️ Uniquement valable si le port n'est joignable **que** par Cloudflare : combiné à M8 (port
  ouvert sur le LAN), un hôte du LAN peut forger cet en-tête. Traiter C1 et M8 ensemble.

---

## 🟠 Majeur

### M1 — SSRF via l'endpoint d'abonnement push non restreint

- **Fichier** : `src/routes/compte/notifications/+server.ts:7-10`
  ```ts
  const abonnement = z.object({
      endpoint: z.string().url(),   // accepte http://, IP internes, longueur illimitée
      keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) })
  });
  ```
- **Problème** : `z.string().url()` accepte n'importe quelle URL (`http://169.254.169.254/…`,
  `http://localhost:…`). L'endpoint est persisté puis le serveur y **émet des requêtes POST** à
  chaque envoi de notification (`webpush.ts:54`).
- **Risque** : SSRF authentifiée (aveugle) — sondage du réseau interne, amplification.
- **Correction** : imposer `https:`, une longueur max, et idéalement une allowlist d'hôtes de
  services push connus :
  ```ts
  endpoint: z.string().url().max(2048)
      .refine((u) => new URL(u).protocol === 'https:', 'https requis')
  // + allowlist : *.push.services.mozilla.com, fcm.googleapis.com,
  //               *.notify.windows.com, web.push.apple.com
  ```

### M2 — Appropriation d'abonnement push (hijack via upsert sur `endpoint`)

- **Fichier** : `src/lib/server/push/webpush.ts:77-90`
  ```ts
  .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth }  // écrase le propriétaire
  });
  ```
- **Problème** : le POST ne vérifie jamais que l'endpoint revendiqué appartient au requérant. Un
  utilisateur authentifié connaissant l'endpoint d'un autre peut se le ré-associer.
- **Risque** : la victime **cesse de recevoir ses notifications** (DoS ciblé) ; ses clés
  `p256dh`/`auth` sont écrasées. Pas d'exfiltration possible (le déchiffrement reste lié au
  navigateur de la victime), mais l'abus est simple.
- **Correction** : sur conflit, n'autoriser la réassociation que si l'ancien `userId` est identique
  (le cas légitime « re-login sur le même appareil » passe par le même user ou une reprise après
  déconnexion — à défaut, supprimer + re-créer côté client plutôt qu'écraser silencieusement).

### M3 — Type MIME des documents jamais vérifié (magic bytes)

- **Fichier** : `src/lib/server/services/documents.ts:180` et `:197`
  ```ts
  if (!estMimeAutorise(file.type)) { … }   // file.type = déclaré par le client
  mimeType: file.type,                     // stocké puis resservi en Content-Type
  ```
- **Problème** : seule la chaîne `file.type` (contrôlée par le client) est validée ; l'extension de
  stockage en est dérivée. Aucun contrôle des octets d'en-tête du binaire.
- **Risque** : stockage de contenu arbitraire déclaré `image/png`, resservi ensuite avec ce
  `Content-Type`. Impact XSS fortement limité (SVG/HTML hors allowlist — bon point), mais la
  vérification annoncée n'existe pas réellement.
- **Correction** : lire les magic bytes (paquet `file-type`) et exiger la cohérence avec le type
  déclaré ; ajouter `X-Content-Type-Options: nosniff` au téléchargement (voir m3).

### M4 — Garde-fou « deux postes du même besoin » non garanti sous concurrence (TOCTOU)

- **Fichiers** : `src/lib/server/services/creneaux.ts:100-114`, `besoins.ts:299-310` (assignation),
  `drizzle/0000_flippant_landau.sql` (aucun index unique sur `poste`).
- **Problème** : le contrôle est un `SELECT` (« déjà sur ce besoin ? ») **puis** un `UPDATE` d'un
  *autre* poste. La clause `WHERE reserved_by IS NULL` protège chaque poste individuellement mais
  pas l'invariant inter-lignes : deux transactions parallèles (double-submit) peuvent chacune lire
  « aucune réservation » puis réserver **deux postes différents** du même besoin.
- **Risque** : double réservation → double comptage d'heures (exactement ce que le commit
  `0597080` voulait empêcher).
- **Correction** : rendre l'invariant atomique en base par un index unique partiel :
  ```sql
  CREATE UNIQUE INDEX poste_un_par_besoin_par_user
      ON poste(besoin_id, reserved_by) WHERE reserved_by IS NOT NULL;
  ```

### M5 — Injection de formule CSV dans les exports  ✅ **Corrigé (2 juillet 2026)**

> `csv.ts` préfixe désormais d'une apostrophe toute cellule commençant par `= + - @ \t \r`
> (vérifié en isolation). Protège les trois exports (récap global, mon-récap, historique
> intervenant).

- **Fichier** : `src/lib/server/services/csv.ts:4-9`
  ```ts
  function escape(value: string): string {
      if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
      return value;   // `=HYPERLINK(...)`, `+`, `-`, `@` passent tels quels
  }
  ```
- **Problème** : une cellule commençant par `=`, `+`, `-`, `@` (ou TAB/CR) est interprétée comme
  **formule** par Excel/LibreOffice. Champs exportés bruts : `nom`, `prenom`
  (`recap/export/+server.ts:19-24`) et `commentaire` (`mon-recap/export/+server.ts:44`).
- **Risque** : exécution/exfiltration sur le poste qui ouvre l'export. Exposition **atténuée**
  aujourd'hui : ces champs sont saisis par l'admin (les intervenants n'éditent ni leur nom ni les
  commentaires), donc pas d'injection par un compte non privilégié — mais l'échappement doit être
  robuste indépendamment de qui saisit.
- **Correction** :
  ```ts
  if (/^[=+\-@\t\r]/.test(value)) value = "'" + value;  // avant le quoting existant
  ```

### M6 — Modification d'un besoin réservé : silencieuse pour les intervenants

- **Fichiers** : `src/routes/(admin)/besoins/[id]/+page.server.ts:91-113` (action `modifier`),
  `src/lib/server/services/besoins.ts:180-240`.
- **Problème** : `modifierBesoin` change librement `date`, `heureDebut`, `heureFin`, pauses, même
  avec des postes réservés (seule la *réduction du nombre* de postes est bloquée). Aucun
  `notifierBesoinModifie` n'existe dans `notifications.ts`.
- **Risque** : un intervenant engagé sur `08:00-18:00` peut se retrouver sur `06:00-12:00` (ou un
  autre jour) **sans en être informé** — il se présente au mauvais horaire, son récap change à son insu.
- **Correction** : notifier les `reserved_by` du besoin quand date/horaires changent ; exiger une
  confirmation explicite côté serveur si des réservations existent.

### M7 — Suppression d'un besoin réservé : cascade sans garde serveur ni notification  ⚠️ **Partiellement corrigé (2 juillet 2026)**

> `supprimerBesoin` refuse désormais **côté serveur** de supprimer un besoin **passé** qui porte
> des réservations (protection de l'historique) et renvoie un message d'erreur. Restent à traiter :
> la suppression d'un besoin **futur** réservé (toujours confirmée seulement côté UI) et la
> notification/`audit_log` des intervenants concernés.


- **Fichiers** : `src/lib/server/services/besoins.ts:243-245` (simple `db.delete`, CASCADE sur
  `poste`), route `supprimer` `besoins/[id]/+page.server.ts:115-119`, confirmation uniquement
  client (`+page.svelte:37-43`, `confirm()`).
- **Problème** : la « confirmation explicite si des réservations existent » (exigence CLAUDE.md)
  n'existe que dans l'UI — un POST direct supprime tout. Aucune notification aux intervenants dont
  la réservation disparaît (alors que la *libération* individuelle, elle, notifie), aucun
  `audit_log`.
- **Correction** : côté serveur, si `compterReservations(id) > 0`, exiger un flag de confirmation
  dans le POST ; notifier les intervenants concernés ; tracer dans `audit_log`.

### M8 — Déploiement réel : port applicatif exposé sur tout le LAN

- **Fichiers** : `docker-compose.yml:11` (`127.0.0.1:` — correct dans le repo) **vs**
  `docs/Déploiement KronoPool_Proxmox_Perso.md` §« Particularité archi » (patch local en `0.0.0.0`
  car `cloudflared` tourne sur une autre machine).
- **Risque** : l'app est joignable en clair par n'importe quel hôte du LAN, en court-circuitant
  Cloudflare — brute-force local sans rate-limit effectif (cf. C1), et `CF-Connecting-IP` devient
  spoofable si on l'active.
- **Correction** : installer `cloudflared` dans le PCT 103 et refermer sur `127.0.0.1` (déjà
  identifié comme « amélioration future » dans le runbook — à prioriser) ; à défaut, règle de
  firewall limitant le port 8085 à l'IP de la machine cloudflared.

### M9 — Aucun en-tête de sécurité HTTP

- **Fichiers** : `src/hooks.server.ts` (le `handle` ne pose aucun header), `src/app.html` (pas de
  meta CSP), `svelte.config.js` (pas de bloc `kit.csp`).
- **Problème** : ni `Content-Security-Policy`, ni `X-Frame-Options`/`frame-ancestors`, ni
  `X-Content-Type-Options: nosniff`, ni `Referrer-Policy`, ni HSTS.
- **Risque** : clickjacking (mise en iframe possible), aucune défense en profondeur contre XSS,
  MIME-sniffing.
- **Correction** : dans `hooks.server.ts` :
  ```ts
  const response = await resolve(event);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // + CSP (prévoir fonts.googleapis.com / fonts.gstatic.com utilisés par app.html)
  ```

### M10 — Notifications push inertes en production Docker (variables non transmises)

- **Fichier** : `docker-compose.yml:12-26` — le bloc `environment:` s'arrête à
  `PUBLIC_DIRECTEUR_TEL` : **`PUBLIC_VAPID_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` et
  `DOCUMENTS_DIR` ne sont pas transmis** au conteneur.
- **Problème** : même avec des clés VAPID correctes dans `.env`, `estPushConfigure()` renvoie
  `false` dans le conteneur → aucune notification n'est jamais envoyée en prod, sans aucune erreur
  visible. (`DOCUMENTS_DIR` est sans impact grâce au défaut dérivé de `DATABASE_URL`, mais la
  variable documentée est ignorée.)
- **Correction** : ajouter au bloc `environment:` du compose :
  ```yaml
  PUBLIC_VAPID_KEY: ${PUBLIC_VAPID_KEY}
  VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
  VAPID_SUBJECT: ${VAPID_SUBJECT}
  ```

### M11 — Aucun index sur les clés étrangères ni les colonnes filtrées

- **Fichiers** : `drizzle/0000…0003_*.sql` — seuls deux index existent, tous deux `UNIQUE`
  (`user.email`, `push_subscription.endpoint`). SQLite n'indexe pas les FK automatiquement.
- **Colonnes en full-scan** à chaque usage : `poste.besoin_id` (tous les joins),
  `poste.reserved_by` (`reservations.ts:46`, `creneaux.ts:59`, `recap-global.ts:24`…),
  `besoin.date` (filtres de période), `session.user_id` (invalidation), `document.user_id`
  (conformité, à **chaque navigation intervenant** via le layout), `push_subscription.user_id`.
- **Risque** : invisible aujourd'hui, mais `poste`/`besoin` croissent chaque semaine sans jamais
  décroître — dans 2-3 ans, chaque affichage de créneaux scanne des milliers de lignes.
- **Correction** : déclarer les `index()` dans `schema.ts` puis `drizzle-kit generate` :
  `poste(besoin_id)`, `poste(reserved_by)`, `besoin(date)`, `session(user_id)`,
  `document(user_id)`, `push_subscription(user_id)`.

---

## 🟡 Mineur

### m1 — `GET /recap/export` protégé par une seule couche
`src/routes/(admin)/recap/export/+server.ts:8` : aucun `requireAdmin` — les endpoints `+server.ts`
n'exécutent pas le `load` du layout `(admin)`, la seule protection est le préfixe `/recap` dans
`hooks.server.ts`. Toutes les autres routes admin ont deux couches. Ajouter
`requireAdmin(locals.user)` en tête (défense en profondeur).

### m2 — Oracle d'existence 403 vs 404 sur les documents
`src/routes/compte/documents/[id]/+server.ts:15-19` : ID inexistant → 404, document d'autrui →
403. Permet de distinguer les deux cas (impact faible : IDs = UUID v4). Renvoyer 404 dans les deux cas.

### m3 — `X-Content-Type-Options: nosniff` absent du téléchargement de documents
`compte/documents/[id]/+server.ts:29-34` : l'injection d'en-tête est bien neutralisée
(`encodeURIComponent` + RFC 5987) mais sans `nosniff`, combiné à M3 (magic bytes), un contenu
trompeur servi `inline` peut être re-sniffé par des navigateurs laxistes.

### m4 — Entrées contournant Zod
Le CDC exige « Zod sur toutes les entrées ». Contournements (fonctionnellement sûrs mais hors
contrat) : `intervenants/[id]/+page.server.ts:65` (`actif === 'true'`), `:94` et
`compte/+page.server.ts:100` (`String(form.get('id'))`), `documents-types/+page.server.ts:40-54`,
`params.id` passés directement (`besoins/[id]:117`, `documents/[id]:14`), filtres `from`/`to`
validés par regex maison. Envelopper dans de petits schémas Zod pour l'uniformité.

### m5 — Pas de vérification d'origine sur `/compte/notifications` (JSON)
`compte/notifications/+server.ts` lit `request.json()` : le contrôle CSRF natif de SvelteKit ne
couvre que les form actions. Risque pratique atténué (JSON cross-site ⇒ preflight CORS), mais
aucune vérification `Origin` explicite. Comparer `request.headers.get('origin')` à `ORIGIN`.

### m6 — Pas de plafond d'abonnements push par utilisateur
`webpush.ts` : aucun cap → bloat DB / amplification d'envoi possible. Limiter (ex. 5 par user).

### m7 — Erreurs push ≠ 404/410 avalées sans log
`webpush.ts:58-62` : un 401/403 (clés VAPID invalides) ou 429 est silencieux — panne
indiagnosticable en prod. Logger les codes inattendus.

### m8 — Énumération de comptes par timing au login
`login/+page.server.ts:50` : retour immédiat si l'email n'existe pas, alors qu'un compte existant
paie le coût Argon2 (`:58`). Le message est bien générique, mais le temps de réponse trahit.
Exécuter un `verify` factice quand l'utilisateur n'existe pas.

### m9 — Sessions expirées jamais purgées
`session.ts` : purge uniquement paresseuse (token re-présenté, désactivation, reset). La session
d'un utilisateur qui ne revient jamais reste en base indéfiniment. Ajouter un
`DELETE FROM session WHERE expires_at < now` périodique (au boot ou opportuniste).

### m10 — Listes non paginées qui croissent sans borne
`planning/+page.server.ts:6-7` renvoie **tous les besoins de l'histoire** au client (le calendrier
filtre ensuite une semaine côté JS) ; `besoins/+page.server.ts:5-6` renvoie tous les passés.
Ajouter une borne temporelle ou une pagination des passés.

### m11 — Statut « en cours » incohérent entre les vues
`besoins.ts:29` bascule un besoin en « Passé » à `heureFin`, mais `creneaux.ts:49` retire les
postes dès `heureDebut` et `reservations.ts:61` classe en « Passées » dès `heureDebut`, tandis que
le récap ne compte qu'à partir de `heureFin`. Un besoin commencé est « À venir » côté admin,
« Passé » côté intervenant, non compté au récap. Uniformiser ou introduire « En cours ».

### m12 — Nom de fichier CSV non assaini dans `Content-Disposition`
`mon-recap/export/+server.ts:62` : `filename="recap_${user.nom}_${user.prenom}.csv"` — accents →
mojibake, caractères spéciaux non filtrés. Utiliser `filename*=UTF-8''…` + slug ASCII.

### m13 — Quirk `hour === '24'` sans report de date
`time.ts:28` mappe `24 → 00` sans incrémenter le jour : sur un runtime ICU rendant minuit comme
`24:00`, la clé serait décalée de 24 h. Latent (Node moderne rend `00:00`), mais fragile.

### m14 — Durcissement Docker : root, healthcheck, version Node
`Dockerfile` : pas de `USER node` (root en cas de RCE), pas de `HEALTHCHECK` (un process bloqué
n'est pas redémarré), image `node:22-slim` non épinglée au patch/digest.

### m15 — `SESSION_SECRET` : variable morte
Présente dans `.env.example`, `docker-compose.yml:17` et le README, mais **jamais lue** dans
`src/` ni `scripts/` (les tokens sont aléatoires et hashés, pas signés). Faux sentiment de
sécurité — l'utiliser réellement ou la retirer. *(La doc a été mise à jour pour le signaler.)*

### m16 — Mots de passe admin lisibles dans l'env du conteneur à vie
`docker-compose.yml:19,23` : `ADMIN*_PASSWORD` restent visibles via `docker inspect`/`printenv`
toute la vie du conteneur. Atténué par `must_change_password=1`. Préférer des secrets fichier ou
dé-provisionner après le premier seed.

### m17 — Vulnérabilités de dépendances (`npm audit` : 15 — 1 critique, 2 high, 8 moderate, 4 low)
La seule qui touche le **runtime de production** :
- **`drizzle-orm` < 0.45.2 (HIGH, CVSS 7.5)** — injection SQL via identifiants mal échappés.
  Exploitabilité faible ici (aucun identifiant dynamique dans le code), mais la mise à jour vers
  `0.45.2` est recommandée (semver-major depuis 0.36 : tester les requêtes).

Le reste concerne l'**outillage de dev uniquement** (jamais exposé en prod) :
- `vitest` ≤ 3.2.5 (**critique** : lecture/exécution de fichiers arbitraires si le serveur UI
  Vitest écoute — n'est pas lancé ici), `vite` ≤ 6.4.2 (high : path traversal dev server, fuite
  NTLMv2 Windows), `esbuild` (moderate : requêtes arbitraires vers le dev server), `drizzle-kit`,
  `@sveltejs/kit` ≤ 2.69.0 (low, via `cookie` < 0.7.0), `@vite-pwa/sveltekit` (low).
  Correction : montée de versions groupée (vite 7+, vitest 4, kit récent) lors d'une fenêtre de
  maintenance — `npm audit fix --force` proposerait des sauts majeurs, à faire manuellement.

---

## 🔵 Suggestion

1. **Traçabilité incomplète** : `libererPoste`/`assignerPoste` écrivent dans `audit_log`, mais pas
   `supprimerPoste`, `supprimerBesoin`, `definirActif` (désactivation de compte),
   `reinitialiserMotDePasse`, `supprimerDocument`. Consigner acteur + cible + horodatage.
   Par ailleurs `audit_log` n'est **jamais lu** nulle part (write-only).
2. **Exclure l'acteur des notifications** : l'intervenant qu'un admin vient de déloger reçoit la
   notification « un créneau se rouvre » pour son propre ex-créneau (`notifications.ts:66-93`).
3. **Garde prod dans `seed-dev.ts`** : les comptes de démo (mot de passe faible,
   `mustChangePassword=false`) ne sont jamais lancés par l'entrypoint Docker (bien), mais un
   `if (process.env.NODE_ENV === 'production') exit(1)` éviterait tout accident.
4. **Google Fonts** chargées depuis le CDN (`app.html:16-21`) : dépendance réseau + IP des
   visiteurs transmises à Google. Auto-héberger les deux polices.
5. **`Promise.all` dans les `load`** : `intervenants/[id]` enchaîne 4 requêtes séquentielles,
   `dashboard` et `besoins/[id]` deux. Gain minime en SQLite local, propreté surtout.
6. **Animation `.caustics`** (`app.css:51-58`) : anime `background-position` (repaint à chaque
   frame) — la plus coûteuse de l'app sur mobile ; passer en `transform` si l'on vise la batterie.
   (Les vagues `WaterWaves` sont, elles, déjà en `transform` composité — RAS.)
7. **Sélection de colonnes explicite** : `intervenants.ts:47-57` lit `password_hash` depuis la DB
   (jamais renvoyé au client grâce à `toView`, mais lecture inutile).
8. **Chevauchement inter-besoins non contrôlé** : rien n'empêche un intervenant d'être réservé sur
   deux besoins distincts au même horaire. Le CDC ne l'exige pas — à trancher explicitement.
9. **Fallback de navigation du service worker** : `service-worker.ts:52` — `win.navigate?.(cible)`
   sans repli si `navigate` échoue (le clic sur la notification focalise sans rediriger).

---

## Ce qui est déjà solide

- **Auth** : Argon2id aux paramètres OWASP (cohérents entre `password.ts`, `seed.ts`, `seed.mjs`),
  tokens de session 256 bits stockés hashés SHA-256, cookie `httpOnly/Secure/SameSite=Lax`,
  expiration glissante, invalidation des sessions à la désactivation et au reset, message de login
  générique, changement de mot de passe forcé réellement bloquant (`hooks.server.ts:73`).
- **Autorisation** : double barrière — préfixes dans `hooks.server.ts` (couvre navigations **et**
  POST) + `requireAdmin`/`requireIntervenant`/`requireUser` dans chaque action. Aucune action ne
  repose sur l'UI seule. Aucune fuite de `passwordHash` dans les `load`. Pas d'open redirect.
- **Réservation** : réellement atomique (`UPDATE … WHERE reserved_by IS NULL` + contrôle
  `rowsAffected`, en transaction, vérifications éligibilité/futur avant) — conforme CDC §9.
  L'assignation manuelle admin applique les mêmes garde-fous.
- **Documents** : noms de stockage en UUID (path traversal impossible), allowlist MIME **sans SVG
  ni HTML** (vecteur XSS stocké neutralisé), contrôle owner-or-admin sur téléchargement et
  suppression, fichiers hors de toute URL publique, `Cache-Control: private, no-store`.
- **Temps** : gestion DST correcte par heure murale `Intl` Europe/Paris + comparaison
  lexicographique de clés à largeur fixe ; testé.
- **Push/PWA** : clé privée VAPID côté `$env/dynamic/private` uniquement (aucune fuite possible) ;
  envoi fire-and-forget (jamais bloquant pour l'action) ; purge des abonnements 404/410 ; service
  worker qui ne précache **que** les assets statiques (aucune page SSR/authentifiée en cache) ;
  manifest complet.
- **Secrets & seed** : `.env` ignoré par git et Docker ; seed idempotent, jamais de mot de passe
  loggé, aucun mot de passe par défaut si la variable manque ; migrations versionnées appliquées au
  boot (pas de `db:push` en prod) ; image sans devDependencies.
- **Validation** : `validation.ts` riche (bornes, refinements pause ∈ créneau / fin > début /
  effectif > 0, email normalisé, longueurs max) ; réappliquée à l'édition.
- **Perf** : aucun N+1 (la conformité en masse est batchée), `lucide-svelte` importé à l'unité,
  connexion DB paresseuse, `prefers-reduced-motion` respecté.

---

## Les 5 priorités

1. **C1 + M8 ensemble** : rapatrier `cloudflared` dans le PCT 103, refermer le port sur
   `127.0.0.1`, puis `ADDRESS_HEADER=CF-Connecting-IP` — rend le rate-limit opérant et supprime
   l'exposition LAN.
2. **M10** : transmettre les variables VAPID dans `docker-compose.yml` — sans ça, la
   fonctionnalité push livrée ne fonctionne tout simplement pas en production.
3. **M1 + M2** : durcir l'endpoint d'abonnement push (https + allowlist + refus de réassociation
   silencieuse) — les deux seuls vrais vecteurs d'abus authentifiés trouvés.
4. **M4 + M11** : une seule migration Drizzle qui ajoute l'index unique partiel anti
   double-réservation **et** les index de FK — verrouille l'invariant métier et prépare la
   croissance des données.
5. **M5 + M9** : neutraliser les formules CSV et poser les en-têtes de sécurité HTTP — deux
   correctifs de quelques lignes chacun.

---

## Écarts documentation ↔ code corrigés lors de cet audit

La documentation a été mise à jour (voir README, CLAUDE.md, `docs/ARCHITECTURE.md`) ; les écarts
suivants existaient et sont désormais corrigés dans la doc :

| Document | Écart constaté | Correction apportée |
|---|---|---|
| `CLAUDE.md` | « Projet greenfield, code non échafaudé » — faux depuis 20+ commits ; structure cible incomplète (pas de `push/`, `storage/`, routes `planning`, `documents-types`, `compte/*`) ; « commandes disponibles une fois le projet créé » | Réécrit : état réel, structure réelle, commandes réelles, features post-V1 (documents, push, PWA, pauses) |
| `CLAUDE.md` | « Récap = SUM(heure_fin − heure_debut) » alors que le code somme le **temps effectif pauses déduites** (comportement voulu, conforme CDC) | Règle reformulée : amplitude *et* effectif, le récap somme l'effectif |
| `README.md` | Aucune mention des documents intervenants, PWA, notifications push, pauses ; structure incomplète ; exemple `docker run` sans variables VAPID ni `DOCUMENTS_DIR` ; contradiction avec le runbook sur le binding `127.0.0.1` vs LAN | Réécrit : fonctionnalités complètes, tableau des variables d'env (VAPID, ORIGIN, DOCUMENTS_DIR), avertissement sur le bloc `environment:` du compose, renvoi au runbook pour l'archi réelle |
| `.env.example` | `SESSION_SECRET` présentée comme utilisée ; domaine réel en exemple pour `ORIGIN` | Marquée « non utilisée à ce jour » ; placeholder générique |
| `docs/PLAN.md` / `docs/PLAN-documents-intervenants.md` | Présentés comme plans courants alors qu'ils sont historiques (Playwright annoncé jamais créé ; « points à confirmer » tranchés depuis) | Bandeau « document historique » + renvoi vers ARCHITECTURE.md |
| `docs/Déploiement KronoPool_Proxmox_Perso.md` | Ne signalait pas que le compose ne transmet pas les variables VAPID (push inertes) | Avertissement ajouté |
| `docs/handoff/README.md` | « Le projet part de zéro » | Bandeau de contexte ajouté (handoff d'origine, conservé comme référence design) |
| *(absent)* | Aucune doc d'architecture (modèle de données, permissions, flux) | `docs/ARCHITECTURE.md` créé |
