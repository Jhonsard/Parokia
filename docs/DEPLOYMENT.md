# Parokia — Runbook de déploiement (Phase 5)

Ce document décrit la mise en service de la plateforme : API REST, base PostgreSQL, interface
web, application mobile et serveur d'automatisation MCP.

---

## 0. Ce qui est vérifié automatiquement, et ce qui reste manuel

| Vérification | Commande | Résultat |
|---|---|---|
| Suite de tests backend (SQLite en mémoire) | `.venv/bin/python -m pytest` | 41 tests passés |
| Contrat REST consommé par le web et le mobile | `curl` sur `/api/health`, `/api/auth/*`, `/api/chapels`, `/api/choirs`, `/api/masses`, `/api/membership-requests`, `/api/liturgical-theme` | Réponses conformes aux schémas Pydantic, 401/403/422 corrects |
| Serveur MCP (stdio) | client MCP Python sur `PAROKIA_RUN_MCP=1 python server.py` | 5 resources, 6 tools, 2 prompts opérationnels |
| Découverte par l'inspecteur MCP | `mcp dev backend/server.py` | Instance `mcp` découverte (`parokia-automation`) |
| Définition Docker Compose | `docker compose config -q` | Valide |
| Interface web | `npm run build` + `npm run dev` | Build Vite OK, proxy `/api` opérationnel |
| Application mobile | `cd mobile && npm run typecheck` | TypeScript strict sans erreur |
| Bundle mobile | `cd mobile && npx expo export --platform android` | Bundle Hermes généré |
| Cohérence des dépendances Expo | `cd mobile && npx expo-doctor` | 21/21 contrôles passés |

**Non vérifié dans cet environnement, à confirmer sur la cible :**

- construction et démarrage des images Docker (aucun accès au démon Docker ici) ;
- exécution sur PostgreSQL 16 (la suite de tests tourne sur SQLite) ;
- rendu visuel de l'interface web et de l'application mobile dans un navigateur ou sur un appareil ;
- build EAS et publication sur les stores.

---

## 1. Variables d'environnement

### Backend (`backend/.env`, copié depuis `backend/.env.example`)

| Variable | Valeur de production | Rôle |
|---|---|---|
| `PAROKIA_ENV` | `production` | Active les garde-fous de production |
| `PAROKIA_STRICT_CONFIG` | `1` | Un secret JWT faible devient une erreur fatale |
| `PAROKIA_JWT_SECRET` | `openssl rand -hex 32` | Signature des jetons (32 caractères minimum) |
| `DATABASE_URL` | `postgresql://user:motdepasse@postgres:5432/parokia_db` | Le préfixe `postgresql://` est converti en `postgresql+psycopg://` |
| `PAROKIA_ALLOWED_ORIGINS` | `https://parokia.org,https://www.parokia.org` | Origines CORS autorisées (le mobile natif n'y est pas soumis) |
| `PAROKIA_ADMIN_EMAIL` / `PAROKIA_ADMIN_PASSWORD` | Compte de démarrage | Créé une seule fois, au premier seed |
| `PAROKIA_ACCESS_TOKEN_MINUTES` | `60` | Durée de vie du jeton |
| `PAROKIA_DOCS_ENABLED` | `0` | Désactive `/docs` et `/redoc` en production |
| `PAROKIA_SEED_ON_STARTUP` | `1` | Seed idempotent (8 chapelles, chorales, agenda de démonstration) |
| `PAROKIA_RUN_MCP` | `0` | Passage à `1` pour lancer le serveur MCP au lieu de l'API HTTP |

### Frontend web

| Variable | Valeur | Rôle |
|---|---|---|
| `VITE_API_URL` | `https://api.parokia.org` | Base des appels API quand le front n'est pas servi par le même nginx |
| `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` | hôte de prévisualisation | Uniquement pour les aperçus distants en développement |

### Application mobile (`mobile/.env`)

| Variable | Valeur | Rôle |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.parokia.org` | Obligatoire pour une build de production ; sans elle, l'app réutilise l'hôte du bundler Expo sur le port 8000 |

---

## 2. Démarrage local sans Docker

```bash
# API + MCP
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # puis renseigner PAROKIA_JWT_SECRET
python server.py              # http://0.0.0.0:8000

# Interface web (autre terminal)
npm ci
npm run dev                   # http://localhost:3000, proxy /api → :8000

# Application mobile (autre terminal)
cd mobile
npm ci
npm run start                 # QR code Expo Go, ou npm run android / npm run web
```

Le back-office agent (inspecteur MCP) nécessite l'extra CLI :

```bash
cd backend && pip install "mcp[cli]==1.2.0"   # déjà listé dans pyproject.toml [dev]
mcp dev backend/server.py
```

---

## 3. Docker Compose (recette / pré-production)

```bash
cp backend/.env.example backend/.env        # renseigner PAROKIA_JWT_SECRET
export PAROKIA_JWT_SECRET=$(openssl rand -hex 32)

docker compose config -q                    # validation du schéma
docker compose up --build -d

docker compose ps
curl -sf http://localhost:8000/api/health
```

Services :

| Service | Port | Remarque |
|---|---|---|
| `postgres` | 5432 | `backend/schema.sql` est monté dans `docker-entrypoint-initdb.d` : le DDL (contraintes, index composites) est appliqué à la création du volume |
| `backend` | 8000 | API FastAPI ; `PAROKIA_ENV=production` et seed idempotent au démarrage |
| `mcp` | stdio | Pas de port exposé : `docker compose run --rm --no-deps mcp` pour brancher un agent |
| `frontend` | 3000 | Serveur Vite de développement avec le code monté en volume |

Pour servir l'interface en statique derrière nginx (configuration de production) :

```bash
docker build -f Dockerfile.frontend -t parokia-frontend .
docker run --rm -p 8080:80 --add-host backend:host-gateway parokia-frontend
```

`docker/nginx.conf` sert le `dist/` hashé, applique `Cache-Control: public, immutable` sur
`/assets/`, expose `/healthz` et relaie `/api/` vers `backend:8000` en conservant
`X-Forwarded-For` et `X-Request-ID` (utilisés par le throttle d'authentification).

---

## 4. Production

1. **Secrets** — Le JWT ne doit jamais être commité : `backend/.env` est ignoré par Git. Utiliser
   les secrets du runner CI ou un gestionnaire de secrets (Vault, SSM).
2. **TLS** — Terminer le TLS devant nginx (Let's Encrypt/certbot ou LB managé), forcer HTTPS,
   activer HSTS, puis ne laisser que `PAROKIA_ALLOWED_ORIGINS` en liste blanche.
3. **Base de données** — PostgreSQL 16, `backend/schema.sql` appliqué une fois, sauvegardes
   `pg_dump` planifiées (rétention 30 jours, restauration testée), index
   `mass_schedules(chapel_id, mass_date)` et `choirs(chapel_id, status)` présents.
4. **Santé** — `GET /api/health` (base incluse) pour la sonde applicative, `GET /healthz` pour
   le conteneur nginx.
5. **Rotation** — Le mot de passe bootstrap doit être changé après la première connexion ; les
   futurs comptes responsables sont créés via `POST /api/choirs/{id}/members`.
6. **Observabilité** — Les logs sont structurés (`asctime [level] logger: message`), les
   tentatives de connexion échouées et les dépassements de throttle sont journalisés.

---

## 5. Serveur MCP (automatisation)

```bash
cd backend
mcp dev server.py          # inspecteur web (nécessite Node pour l'interface)
PAROKIA_RUN_MCP=1 python server.py   # stdio direct, pour un agent
```

Surfaces vérifiées :

- **Resources** — `parish://masses/schedule`, `parish://membership/pending`, `parish://chapels`,
  `parish://liturgical-theme`, `parish://choirs/approved`.
- **Tools** — `approve_membership_request`, `reject_membership_request`, `auto_assign_choirs`,
  `update_liturgical_theme`, `create_mass_schedule`, `list_pending_requests`.
- **Prompts** — `generate_sunday_bulletin`, `review_pending_requests`.

Les échecs sont renvoyés en données (`{"ok": false, "error": "…"}`) et non en exceptions de
transport, afin qu'un agent puisse réagir sans casser la session.

---

## 6. Application mobile

```bash
cd mobile
cp .env.example .env         # EXPO_PUBLIC_API_URL=https://api.parokia.org
npm run typecheck
npx expo export --platform android     # contrôle du bundle
npx eas build --profile production --platform all
npx eas submit --platform all
```

- Identifiants déjà déclarés : `org.parokia.mobile` (iOS et Android), schéma `parokia`.
- L'application ne contient aucun secret : elle ne parle qu'à l'API REST et stocke uniquement le
  JWT de l'utilisateur dans le trousseau de l'appareil.
- Toute mise à jour de contenu (agenda, chorales, demandes, couleur liturgique) est immédiate
  puisqu'elle vient de l'API ; une nouvelle build n'est requise que pour un changement de code.
- `PAROKIA_ALLOWED_ORIGINS` n'a pas besoin de lister l'application native (pas de CORS hors
  navigateur) mais doit contenir l'origine de l'aperçu web Expo si celui-ci est utilisé.

---

## 7. Checklist de mise en service

- [ ] `backend/.env` renseigné, `PAROKIA_JWT_SECRET` généré et stocké hors du dépôt
- [ ] `docker compose config -q` sans erreur
- [ ] `docker compose up --build -d` puis `curl -sf http://<hôte>:8000/api/health`
- [ ] Mot de passe bootstrap changé, comptes responsables créés par chapelle
- [ ] Thème liturgique du jour réglé depuis la console web
- [ ] `EXPO_PUBLIC_API_URL` défini, build EAS signée et testée sur un appareil réel
- [ ] `mcp dev server.py` ouvre l'inspecteur et liste les six outils
- [ ] Sauvegardes PostgreSQL planifiées et restauration testée
- [ ] TLS actif, `/docs` désactivé, origines CORS limitées

---

## 8. Journal des correctifs de la Phase 5

| Fichier | Correctif | Impact |
|---|---|---|
| `docker-compose.yml` | `build.file` → `build.dockerfile` | Le schéma Compose v2 rejetait la pile : aucun service ne pouvait démarrer |
| `backend/requirements.txt` | `pytest==8.4.6` → `8.4.2` | Version inexistante : l'installation des dépendances échouait |
| `backend/parokia/mcp_server.py` | Logger `mcp.server.fastmcp` forcé à INFO | FastMCP 1.2.0 journalise `extra={"name": …}`, réservé par `LogRecord` : le serveur MCP plantait en mode debug |
| `backend/parokia/mcp_server.py` | Service `auto_assign_choirs` importé sous alias | L'outil MCP du même nom s'appelait récursivement et échouait à chaque appel |
| `backend/server.py` | Instance `mcp` exposée au niveau module | `mcp dev backend/server.py` découvrait l'application FastAPI au lieu du serveur MCP |
| `src/App.jsx` | `chapel_id` numérique résolu via `GET /api/chapels` | Le formulaire envoyait le code « TGN » : 422 masqué par un faux succès local |
| `src/App.jsx`, `mobile/src/api/client.ts` | Lecture de l'enveloppe d'erreur `{error: {message, details}}` | Les messages de validation redeviennent lisibles côté web et mobile |
