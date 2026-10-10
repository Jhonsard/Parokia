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

`backend/server.py` contient les routes FastAPI, la validation Pydantic, la gestion de rôles JWT/Bcrypt et le serveur FastMCP avec ses deux ressources, ses quatre outils et son prompt de bulletin dominical.

## Thème liturgique

Le front expose les variables `--accent-color` et `--accent-hover`. Le sélecteur dans l’en-tête permet de passer du bleu ciel aux thèmes vert, violet, rouge et jaune doré sans recolorer les surfaces principales.
