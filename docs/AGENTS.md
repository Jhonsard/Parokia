ROLE & MISSION
Vous êtes un Architecte Logiciel Full-Stack Senior et Lead UI/UX Designer.
Votre mission est de concevoir et développer la plateforme web et mobile de gestion, de planification et d'actualités des chorales pour les messes de la paroisse Notre-Dame d'Afrique / Goma.

CHARTE GRAPHIQUE & THÈME LITURGIQUE DYNAMIQUE
1. Adaptation du Design RFI & Flexibilité des Visuels
Inspiration UI/Layout : Structure éditoriale, hiérarchie de l'information, grille d'actualités et cartes de services inspirées directement du design de RFI (https://www.rfi.fr/fr).

Gestion des Icônes & Images (Directive Anti-Générique) :

Ne pas inventer d'icônes génériques ou banales pour représenter les informations des pages, chapelles ou services.

Laisser la possibilité explicite aux développeurs d'injecter soit des composants SVG personnalisés, soit des photos réelles (fichiers ou URLs d'images) à la place des icônes d'information.

Prévoir un composant React générique DynamicIconOrImage capable de basculer de manière transparente entre un composant d'icône et une image photoréaliste avec état de chargement et fallback de sécurité en cas d'erreur de chargement de l'image.

Remplacement de la palette RFI :

Fond principal & Conteneurs : Blanc dominant (#FFFFFF / #F8FAFC).

Typographie & Textes : Noir / Anthracite foncé (#0F172A / #1E293B).

Couleur d'Accentuation par Défaut : Bleu Ciel (#0284C7 / #38BDF8, remplace intégralement le rouge signature de RFI sur les cartes, badges, bordures, boutons d'action et bandeaux).

Couleur Secondaire / Drapé : Jaune Doré (#EAB308 / #FACC15, utilisé pour les touches d'excellence, icônes clés, surbrillances et éléments solennels).

2. Thème Liturgique Modifiable par l'Administration
L'administration doit avoir la possibilité de modifier dynamiquement la couleur d'accentuation du site pour refléter les temps forts du calendrier liturgique de l'Église catholique.

Périmètre d'application : Ce changement s'applique uniquement aux emplacements où la couleur d'accentuation (Bleu Ciel par défaut / Rouge sur RFI) est utilisée via l'injection de variables CSS root (--accent-color, --accent-hover). La majorité de la page reste blanche et le texte demeure noir.

Couleurs liturgiques configurables :

Bleu Ciel (#0284C7 / #38BDF8 - Fêtes mariales / Couleur par défaut - Paroisse Notre-Dame d'Afrique).

Vert (#16A34A / #22C55E - Temps Ordinaire).

Violet (#7C3AED / #A855F7 - Avent et Carême / Temps de pénitence et d'attente).

Rouge (#DC2626 / #EF4444 - Dimanche des Rameaux, Vendredi Saint, Pentecôte, Fêtes des Martyrs).

Jaune Doré / Blanc (#EAB308 / #FACC15 - Temps de Noël, Temps Pascal, Solennités du Seigneur).

IDÉOLOGIE & ESPRIT PASTORAL
Inspiration Philosophie : Radio Maria France (https://www.radiomaria.fr).

Esprit : Approche communautaire, évangélisatrice, axée sur la prière, le rassemblement spirituel et le service de la liturgie par le chant sacré.

Style rédactionnel : Zéro cliché générique d'IA. Style institutionnel, ecclésial, chaleureux et professionnel.

ARCHITECTURE TECHNIQUE & STACK OBLIGATOIRE
[IMPORTANT TECHNICAL CONSTRAINT: All technical instructions, backend models, API endpoints, database schemas, code annotations, MCP integration specs, Pydantic models, and configuration variables must be written strictly in English.]

Front-End Web : JavaScript (ES6+), React.js, Tailwind CSS (utilisant des variables CSS natives --accent-color configurées dans Tailwind).

Mobile Application : React Native (iOS & Android).

Back-End API : Python avec FastAPI, Pydantic v2 pour la validation d'entrée, et SQLAlchemy ORM.

Database : PostgreSQL (Database relationnelle avec contraintes de clés étrangères intelligentes, indexation composite sur chapelles/messes et types énumérés).

Automation & Extensibility : MCP Server Integration (Model Context Protocol via le SDK FastMCP Python). Le backend Python doit inclure un serveur FastMCP fonctionnel réservé à l'automatisation des tâches (génération de plannings, validation de demandes d'adhésion, mises à jour du thème liturgique).

Security & Auth : JWT (JSON Web Tokens) avec hachage Bcrypt et contrôle d'accès basé sur les rôles (RBAC: ADMIN, CHOIR_LEADER, PUBLIC).

ARCHITECTURE AVANCÉE DATABASE (PostgreSQL DDL)
Provide the full executable PostgreSQL DDL SQL script. Do not use shortcuts or placeholders. Include data types (SERIAL, VARCHAR, TIMESTAMPTZ, CHECK constraints), foreign keys with explicit ON DELETE actions, and indexes:

chapels (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, code VARCHAR(20) UNIQUE NOT NULL, description TEXT, image_url TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)

choirs (id SERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, chapel_id INT REFERENCES chapels(id) ON DELETE CASCADE, leader_name VARCHAR(150) NOT NULL, leader_email VARCHAR(255) NOT NULL, status VARCHAR(20) CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)

users (id SERIAL PRIMARY KEY, full_name VARCHAR(150) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) CHECK (role IN ('ADMIN', 'CHOIR_LEADER', 'PUBLIC')) DEFAULT 'PUBLIC', choir_id INT REFERENCES choirs(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)

mass_schedules (id SERIAL PRIMARY KEY, chapel_id INT REFERENCES chapels(id) ON DELETE CASCADE, choir_id INT REFERENCES choirs(id) ON DELETE SET NULL, mass_date DATE NOT NULL, mass_time TIME NOT NULL, title VARCHAR(200) NOT NULL, liturgical_color VARCHAR(30) NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)

membership_requests (id SERIAL PRIMARY KEY, full_name VARCHAR(150) NOT NULL, choir_name VARCHAR(150) NOT NULL, chapel_id INT REFERENCES chapels(id) ON DELETE CASCADE, status VARCHAR(20) CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING', submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, reviewed_by INT REFERENCES users(id) ON DELETE SET NULL, reviewed_at TIMESTAMPTZ)

liturgical_settings (id SERIAL PRIMARY KEY, current_color VARCHAR(30) NOT NULL DEFAULT '#0284C7', active_season VARCHAR(100) NOT NULL DEFAULT 'Ordinary Time', updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_by INT REFERENCES users(id) ON DELETE SET NULL)

Add indexes for mass_schedules(chapel_id, mass_date) and choirs(chapel_id, status).

ARCHITECTURE AVANCÉE BACKEND & MCP (Python FastMCP)
Implement a complete Python FastMCP server script (server.py) using from mcp.server.fastmcp import FastMCP. Include explicit type hints and error handling:

Resources MCP:

@mcp.resource("parish://masses/schedule") returning a structured JSON string of mass schedules across all 8 chapels.

@mcp.resource("parish://membership/pending") returning pending choir membership requests.

Tools MCP:

@mcp.tool() def approve_membership_request(request_id: int, reviewer_id: int) -> str:

@mcp.tool() def reject_membership_request(request_id: int, reason: str, reviewer_id: int) -> str:

@mcp.tool() def auto_assign_choirs(chapel_id: int, month: int, year: int) -> str:

@mcp.tool() def update_liturgical_theme(color_code: str, season_name: str, updated_by: int) -> str:

Prompts MCP:

@mcp.prompt() def generate_sunday_bulletin(mass_date: str) -> str: (Generates a Sunday parish bulletin prompt combining choir assignments per chapel).

SPÉCIFICATIONS FRONT-END & COMPOSANTS REACT DÉTAILLÉS
1. Navigation Supérieure (Top Navigation Bar)
Barre de navigation intégrant les 8 chapelles : [TUNGANE | USHINDI | AMANI | MAPENDO | AMKENI | UMOJA | TUNDA | MWANGAZA].

Style inspiré du bandeau supérieur RFI (défilement horizontal fluide, typographie claire).

Intégration dynamique des classes Tailwind adaptées aux variables CSS liturgiques.

2. Composant DynamicIconOrImage (React + Tailwind CSS)
Composant React recevant les props (icon, imageUrl, alt, className).

Rendu conditionnel : si imageUrl est défini, rendre la balise <img> avec gestion d'état de chargement (isLoading) et bascule automatique sur l'icône SVG en cas d'erreur (onError).

Si aucune image n'est fournie, rendre le composant d'icône vectorielle passée en prop.

3. Module d'Adhésion des Chorales (Restriction Stricte)
Formulaire réservé aux responsables : Nom complet, Nom de la chorale, Choix de la chapelle parmi les 8 chapelles.

Soumission en état PENDING.

FLUX DE TRAVAIL (WORKFLOW DE DÉVELOPPEMENT)
Phase 1 : Database Schema & Architecture MCP (Python + PostgreSQL)

Rédaction du script SQL DDL complet pour PostgreSQL.

Implémentation du serveur FastMCP Python.

Phase 2 : API REST & Auth (Python FastAPI)

Modèles Pydantic, routes Auth JWT et endpoints de gestion des demandes et du thème liturgique.

Phase 3 : Interface Web React + Tailwind CSS

Configuration Tailwind CSS avec variables CSS pour le thème liturgique (bg-[var(--accent-color)]).

Implémentation du composant HeaderNavbar (avec les 8 chapelles).

Implémentation du composant DynamicIconOrImage.

Phase 4 : Mobile App (React Native)

Interface de consultation pour les responsables de chorales.

Phase 5 : Integration & Deployment

Verification du serveur MCP via mcp dev server.py et conteneurisation Docker.

RÉSULTAT ATTENDU (DIRECTIVE D'EXHAUSTIVITÉ)
Générez TOUT le code demandé de manière intégrale sans abréviations, ni commentaires du type // TODO, ni ellipses. Fournissez :

Le script SQL DDL PostgreSQL complet.

Le code source Python complet du serveur FastMCP (server.py).

La configuration Tailwind CSS et CSS native.

Le code React complet pour HeaderNavbar et DynamicIconOrImage.
