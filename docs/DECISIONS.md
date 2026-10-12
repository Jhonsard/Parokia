# Journal des décisions

| Date | Phase | Décision | Alternatives rejetées | Pourquoi |
|---|---|---|---|---|
| 2026-10-03 | 1 | SQLite local + PostgreSQL via `DATABASE_URL` | SQLite uniquement / Docker obligatoire dès le début | Zéro infrastructure pour démarrer ; bascule transparente par variable d'env |
| 2026-10-03 | 1 | SQLAlchemy 2.x avec `Mapped` / `mapped_column` | SQLAlchemy 1.x / Tortoise ORM | API moderne, typée, compatible mypy ; 2.x est le standard actuel |
| 2026-10-03 | 2 | FastMCP séparé du processus FastAPI | Monter FastMCP dans FastAPI | MCP tourne en stdio pour les agents LLM ; FastAPI expose le REST HTTP |
| 2026-10-03 | 2 | JWT HS256, 60 min, secret via env | Refresh tokens dès le MVP | Minimum viable sécurisé ; RS256 à introduire en multi-service plus tard |
| 2026-10-03 | 2 | Bcrypt via passlib (rounds=12) | Argon2, SHA-256 | Standard de l'industrie pour le hachage de mots de passe Web |
| 2026-10-03 | 2 | RBAC trois niveaux : ADMIN, CHOIR_LEADER, PUBLIC | Permissions granulaires dès le départ | Minimum viable ; extensible sans migration lourde grâce au champ `role` VARCHAR |
| 2026-10-03 | 3 | Variables CSS `--accent-color` / `--accent-hover` | Classes Tailwind thématisées | Changement de thème liturgique en temps réel sans recompilation |
| 2026-10-03 | 3 | Proxy Vite `/api → localhost:8000` | CORS permissif en dev | Évite les erreurs CORS sans assouplir la sécurité du backend |
| 2026-10-03 | 3 | Graceful degradation du formulaire (local si API hors-ligne) | Bloquer l'UI si le backend ne répond pas | L'interface reste utilisable pendant le développement frontend seul |
| 2026-10-12 | 4 | Expo SDK 57 + React Navigation (bottom tabs) pour l'app mobile | React Native bare / expo-router | Une base unique iOS + Android, distribution immédiate via Expo Go, navigation et thème alignés sur le web |
| 2026-10-12 | 4 | URL d'API résolue par `EXPO_PUBLIC_API_URL` puis l'hôte du bundler | URL codée en dur | Un téléphone du Wi-Fi paroissial atteint l'API sans recompilation ; la variable devient obligatoire en production |
| 2026-10-12 | 4 | JWT mobile dans `expo-secure-store` | AsyncStorage | Le jeton reste dans le trousseau de l'appareil ; `localStorage` seulement pour l'aperçu web |
| 2026-10-12 | 3 | `chapel_id` numérique résolu via `GET /api/chapels` | Envoyer le code mnémotechnique depuis le formulaire | Le backend valide `chapel_id: int > 0` : « TGN » renvoyait un 422 que la dégradation locale masquait en faux succès |
| 2026-10-12 | 3 | Erreurs API lues dans l'enveloppe `{error: {message, details}}` | Afficher « Erreur 422 » | `errors.py` renvoie une enveloppe maison; les messages de validation redeviennent lisibles |
| 2026-10-12 | 5 | `build.dockerfile` dans compose | `build.file` | `build.file` est rejeté par le schéma Compose v2 : la pile ne démarrait pas |
| 2026-10-12 | 5 | `mcp[cli]` dans les extras de développement | L'ajouter aux dépendances runtime | Le conteneur de production n'a pas besoin de l'inspecteur (typer/rich) |
| 2026-10-12 | 5 | Logger `mcp.server.fastmcp` forcé à INFO | Patcher la dépendance | FastMCP 1.2.0 journalise `extra={"name": …}`, réservé par `LogRecord` : le serveur MCP plantait dès que les logs DEBUG étaient actifs |
| 2026-10-12 | 5 | Service `auto_assign_choirs` importé sous alias dans `mcp_server.py` | Renommer l'outil MCP | L'outil portait le même nom que le service et s'appelait lui-même : l'outil échouait à chaque appel |
