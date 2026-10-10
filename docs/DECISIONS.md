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
