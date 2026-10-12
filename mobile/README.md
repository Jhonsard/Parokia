# Parokia Mobile — consultation pour les responsables de chorales

Application React Native (Expo) qui prolonge la plateforme **Parokia** de la paroisse
**Notre-Dame d’Afrique / Goma**. Elle est volontairement centrée sur la consultation :
un responsable de chorale retrouve son service de chant, l’agenda des messes de sa
chapelle et la file des demandes d’adhésion.

## Périmètre fonctionnel

| Écran | Contenu | Endpoints |
|---|---|---|
| Connexion | JWT par e-mail / mot de passe, session conservée dans le trousseau de l’appareil | `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/me/choir` |
| Accueil | Profil, chorale rattachée, prochaines messes, nombre de demandes en attente | `GET /api/masses`, `GET /api/membership-requests` |
| Messes | Agenda filtrable (ma chapelle / toutes, 7 jours / 30 jours / tout) et programmation d’une célébration | `GET /api/masses`, `POST /api/masses` |
| Chorales | Ma chorale puis le répertoire des huit chapelles, filtres chapelle et statut | `GET /api/choirs`, `GET /api/chapels` |
| Demandes | File d’adhésion ; approbation / rejet (motif obligatoire) réservés au rôle ADMIN | `GET /api/membership-requests`, `PATCH /api/membership-requests/{id}` |
| Thème | Temps liturgique en vigueur, nuancier des cinq couleurs, aperçu local | `GET /api/liturgical-theme`, `GET /api/liturgical-theme/palette` |

L’application respecte les règles RBAC du backend : un compte `CHOIR_LEADER` lit la file
des demandes mais ne peut pas la modifier, un compte `PUBLIC` ne la voit pas.

## Démarrage

```bash
cd mobile
npm install
npm run start        # QR code Expo Go (Android / iOS)
npm run android      # émulateur Android
npm run ios          # simulateur iOS (macOS)
npm run typecheck    # tsc --noEmit
```

Le backend doit tourner en parallèle :

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python server.py     # écoute sur 0.0.0.0:8000
```

### Adresse de l’API

`src/config.ts` résout l’URL dans cet ordre :

1. `EXPO_PUBLIC_API_URL` (obligatoire pour une build de production) ;
2. l’hôte du bundler Expo, port `8000` — un téléphone sur le même Wi-Fi que la machine
   de développement atteint ainsi l’API sans configuration ;
3. les valeurs par défaut de la plateforme : `10.0.2.2` (émulateur Android), `localhost` ailleurs.

Copiez `.env.example` vers `.env` pour figer une adresse :

```bash
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
```

Le backend doit autoriser l’origine du client mobile : `PAROKIA_ALLOWED_ORIGINS`
(les appels natifs ne sont pas soumis au CORS, mais l’aperçu web Expo l’est).

## Architecture

```
mobile/
├── App.tsx                       ← providers : polices, thème liturgique, session
├── src/
│   ├── api/
│   │   ├── client.ts             ← fetch typé, JWT, délai maximal, ApiError
│   │   ├── endpoints.ts          ← un appel par route FastAPI
│   │   └── types.ts              ← miroir TypeScript de schemas.py
│   ├── auth/                     ← JWT (SecureStore / localStorage) et contexte de session
│   ├── components/               ← AppText, Card, Chip, DynamicIconOrImage, StateView…
│   ├── hooks/useAsyncData.ts     ← chargement, erreur, pull-to-refresh
│   ├── lib/format.ts             ← dates et heures françaises (sans Intl)
│   ├── navigation/RootNavigator.tsx
│   ├── screens/                  ← six écrans du tableau ci-dessus
│   └── theme/                    ← jetons de design, thème liturgique, polices
└── assets/                       ← icônes et écran de lancement Expo
```

La charte du projet est reprise à l’identique : surfaces blanches, texte anthracite,
accent liturgique unique (`--accent-color` sur le web → `useLiturgicalTheme().accent`
sur mobile), Manrope pour l’interface et Fraunces pour les titres editoriaux.

## Vérifications

```bash
npm run typecheck
npx expo export --platform android   # bundle Hermes de contrôle
npx expo-doctor
```
