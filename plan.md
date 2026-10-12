# Parokia — Plan d'implémentation

## Produit
Parokia est la plateforme éditoriale et pastorale de la paroisse Notre-Dame d'Afrique à Goma.
Elle rend visibles les nouvelles de la communauté, les horaires de messe, les rendez-vous des
chorales et le chemin d'adhésion des responsables.

---

## Direction artistique

- **Mouvement** : éditorial radiophonique contemporain, inspiré de la densité informationnelle de
  RFI, adouci par la sobriété liturgique et l'accueil communautaire de Radio Maria.
- **Principes** : hiérarchie nette, respiration blanche, information immédiatement scannable,
  accent bleu ciel modulable par le calendrier liturgique.
- **Couleur** : blanc → espace de confiance ; anthracite → gravité institutionnelle ;
  bleu ciel `#0284C7` → signature paroissiale ; jaune doré `#EAB308` → moments solennels.
- **Typographie** : Manrope (interface) + Fraunces (titres éditoriaux).
- **Essence de marque** : « Le fil vivant des voix, des messes et des engagements de Notre-Dame d'Afrique. »

---

## Architecture technique

```
Parokia/
├── backend/                   ← API Python
│   ├── server.py              ← FastAPI + FastMCP (production-ready)
│   ├── schema.sql             ← DDL PostgreSQL complet (idempotent)
│   ├── requirements.txt       ← dépendances Python
│   ├── .env.example           ← variables d'environnement à copier
│   └── Dockerfile             ← image multi-stage (non-root, healthcheck)
│
├── src/                       ← Application React
│   ├── components/
│   │   ├── HeaderNavbar.jsx   ← bandeau chapelles + sélecteur liturgique
│   │   └── DynamicIconOrImage.jsx ← image avec fallback sur icône SVG
│   ├── App.jsx                ← orchestration, hooks, formulaire d'adhésion
│   ├── main.jsx               ← point d'entrée React
│   ├── data.js                ← données éditoriales locales (démo)
│   └── styles.css             ← variables CSS liturgiques + layout complet
│
├── mobile/                    ← Application React Native (Expo)
│   ├── App.tsx                ← providers : polices, thème liturgique, session
│   ├── src/api/               ← client fetch typé, endpoints, types Pydantic mirroir
│   ├── src/auth/              ← JWT (SecureStore), contexte de session
│   ├── src/components/        ← AppText, Card, Chip, DynamicIconOrImage, StateView…
│   ├── src/screens/           ← connexion, accueil, messes, chorales, demandes, thème
│   └── src/theme/             ← jetons de design, thème liturgique, polices
│
├── public/
│   └── manus-routes.json      ← manifeste des routes SPA
│
├── docs/                      ← documentation projet
│   ├── TODO.md                ← livrables
│   ├── DECISIONS.md           ← journal des décisions techniques
│   ├── DEPLOYMENT.md          ← runbook de mise en service (Phase 5)
│   └── AGENTS.md              ← spécifications & contraintes complètes
│
├── index.html                 ← point d'entrée HTML (src/main.jsx)
├── vite.config.js             ← Vite + proxy /api → localhost:8000
├── tailwind.config.js         ← Tailwind branché sur variables CSS
├── postcss.config.js
├── package.json
├── .gitignore
└── README.md
```

---

## Décisions techniques

| Décision | Justification |
|---|---|
| SQLite en local, PostgreSQL en prod | Zéro infrastructure pour démarrer ; bascule par `DATABASE_URL` |
| SQLAlchemy 2.x Mapped/mapped_column | API moderne, typed, compatible mypy |
| FastMCP séparé de FastAPI | MCP tourne en stdio pour les agents ; FastAPI expose le REST HTTP |
| Pydantic v2 strict | Validation forte, sérialisation JSON intégrée |
| JWT HS256 (60 min) | Standard simple ; à remplacer par RS256 en multi-service |
| Bcrypt via passlib | Standard de l'industrie pour le hachage de mots de passe |
| RBAC (ADMIN, CHOIR_LEADER, PUBLIC) | Minimum viable ; extensible vers des permissions granulaires |
| Vite proxy `/api` | Évite les problèmes CORS en développement |
| CSS variables `--accent-color` | Changement de thème liturgique sans recolorer toute la feuille |
| Expo SDK 57 + React Navigation (bottom tabs) | React Native nu / expo-router | Une seule base iOS + Android, démarrage immédiat via Expo Go, quatre onglets et un thème cohérents avec le web |
| URL d'API résolue dynamiquement (`EXPO_PUBLIC_API_URL`, sinon l'hôte du bundler) | URL codée en dur | Un téléphone sur le Wi-Fi paroissial atteint l'API de développement; variable obligatoire en production |
| JWT mobile dans SecureStore | AsyncStorage | Le jeton reste dans le trousseau de l'appareil (localStorage uniquement pour l'aperçu web) |

---

## Flux de travail (phases)

### Phase 1 ✅ — Database Schema & MCP
- DDL PostgreSQL complet (`backend/schema.sql`)
- Serveur FastMCP (`backend/server.py`) : resources, tools, prompt

### Phase 2 ✅ — API REST & Auth
- Modèles Pydantic v2
- Routes : `/api/health`, `/api/auth/*`, `/api/chapels`, `/api/choirs`,
  `/api/masses`, `/api/membership-requests`, `/api/liturgical-theme`
- JWT + Bcrypt + RBAC

### Phase 3 ✅ — Interface Web React
- `HeaderNavbar` avec les 8 chapelles et sélecteur liturgique
- `DynamicIconOrImage` avec état de chargement et fallback
- Formulaire d'adhésion avec tentative d'appel API (graceful degradation)
- Thème liturgique via variables CSS

### Phase 4 ✅ — Mobile App React Native
- `mobile/` : application Expo (SDK 57, TypeScript strict) pour les responsables de chorales
- Connexion JWT (`POST /api/auth/login`), session restaurée depuis le trousseau de l'appareil
- Cinq onglets : Accueil (profil + chorale + prochaines messes), Messes (filtres chapelle/période,
  programmation d'une célébration), Chorales (répertoire des huit chapelles), Demandes
  (lecture pour `CHOIR_LEADER`, approbation/rejet avec motif pour `ADMIN`), Thème (temps liturgique
  en vigueur + nuancier avec aperçu local)
- `DynamicIconOrImage` porté en React Native (photo, chargement, repli sur icône)
- Thème liturgique et typographie repris du web (Manrope + Fraunces, repli système si les
  polices ne se chargent pas)
- Vérifications : `npm run typecheck`, `npx expo export --platform android` (bundle Hermes),
  `npx expo-doctor` (21/21)

### Phase 5 — Intégration & Déploiement
- `docker-compose.yml` validé (`docker compose config -q`) après correction de `build.file` →
  `build.dockerfile`, qui empêchait tout démarrage de la pile
- Serveur MCP vérifié de bout en bout en stdio : 5 resources, 6 tools, 2 prompts
  (`mcp dev backend/server.py` opérationnel une fois `mcp[cli]` installé, instance `mcp` exposée
  par `server.py`)
- Runbook complet (variables, TLS, sauvegardes, inspecteur MCP, build EAS de l'app mobile) :
  `docs/DEPLOYMENT.md`
> Reste à faire sur une machine avec un démon Docker : `docker compose up --build` puis
> vérification PostgreSQL, et `eas build` pour publier l'app mobile.
