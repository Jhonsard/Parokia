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
├── public/
│   └── manus-routes.json      ← manifeste des routes SPA
│
├── docs/                      ← documentation projet
│   ├── TODO.md                ← livrables
│   ├── DECISIONS.md           ← journal des décisions techniques
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

### Phase 4 — Mobile App React Native
> À venir — interface de consultation pour responsables de chorales.

### Phase 5 — Intégration & Déploiement
> PostgreSQL, Docker Compose, nginx, SSL, MCP via `mcp dev backend/server.py`.
