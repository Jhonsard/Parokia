# Parokia — Notre-Dame d’Afrique

Parokia est une interface éditoriale et pastorale pour la paroisse Notre-Dame d’Afrique à Goma. Elle reprend une logique de fil d’actualité inspirée de RFI, avec une palette liturgique configurable et des modules centrés sur les messes et les chorales.

## Démarrage web

```bash
npm install
npm run dev
```

Le front écoute sur `http://localhost:3000`.

## API et MCP

Le DDL complet se trouve dans `backend/schema.sql`. Le serveur Python de démonstration se lance avec :

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python server.py
```

`backend/server.py` contient les routes FastAPI, la validation Pydantic, la gestion de rôles JWT/Bcrypt et le serveur FastMCP avec ses cinq ressources, ses six outils et ses deux prompts (bulletin dominical, revue des demandes).

## Application mobile

`mobile/` contient l’application React Native (Expo SDK 57) destinée aux responsables de chorales :
connexion JWT, tableau de bord de la chorale, agenda des messes filtrable, répertoire des chorales,
file des demandes d’adhésion et thème liturgique.

```bash
cd mobile
npm ci
npm run start          # QR code Expo Go (Android / iOS)
npm run typecheck
```

L’adresse de l’API est résolue par `EXPO_PUBLIC_API_URL`, sinon par l’hôte du bundler Expo sur le
port 8000 : un téléphone du même réseau atteint directement `backend/server.py`. Détails et
périmètre fonctionnel dans `mobile/README.md`.

## Thème liturgique

Le front expose les variables `--accent-color` et `--accent-hover`. Le sélecteur dans l’en-tête permet de passer du bleu ciel aux thèmes vert, violet, rouge et jaune doré sans recolorer les surfaces principales. L’application mobile lit le thème en vigueur sur `GET /api/liturgical-theme` et reprend la même charte.

## Documentation

- `plan.md` — plan d’implémentation et état des cinq phases
- `docs/DEPLOYMENT.md` — runbook de déploiement (Docker, TLS, sauvegardes, MCP, build EAS)
- `docs/DECISIONS.md` — journal des décisions techniques
- `docs/AGENTS.md` — spécifications et contraintes de conception
