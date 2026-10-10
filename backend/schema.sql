-- =============================================================================
-- Parokia — PostgreSQL DDL
-- Paroisse Notre-Dame d'Afrique, Goma
-- =============================================================================
-- Usage:
--   psql -U parokia_user -d parokia_db -f schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE choir_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'CHOIR_LEADER', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chapels (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL,
    code        VARCHAR(20)     UNIQUE NOT NULL,
    description TEXT,
    image_url   TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE chapels IS 'The eight chapel communities of Notre-Dame d''Afrique parish.';
COMMENT ON COLUMN chapels.code IS 'Short mnemonic code used in API routes and frontend (e.g. TGN, USH).';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS choirs (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(150)    NOT NULL,
    chapel_id    INT             NOT NULL REFERENCES chapels(id) ON DELETE CASCADE,
    leader_name  VARCHAR(150)    NOT NULL,
    leader_email VARCHAR(255)    NOT NULL,
    status       choir_status    NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE choirs IS 'Choral groups affiliated with a chapel.';
COMMENT ON COLUMN choirs.status IS 'PENDING = awaiting admin approval; APPROVED = active; REJECTED = declined.';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(150)    NOT NULL,
    email         VARCHAR(255)    UNIQUE NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    role          user_role       NOT NULL DEFAULT 'PUBLIC',
    choir_id      INT             REFERENCES choirs(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'Platform user accounts. Passwords are Bcrypt-hashed.';
COMMENT ON COLUMN users.role IS 'ADMIN: full access. CHOIR_LEADER: manage own choir and masses. PUBLIC: read-only.';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mass_schedules (
    id               SERIAL PRIMARY KEY,
    chapel_id        INT             NOT NULL REFERENCES chapels(id) ON DELETE CASCADE,
    choir_id         INT             REFERENCES choirs(id) ON DELETE SET NULL,
    mass_date        DATE            NOT NULL,
    mass_time        TIME            NOT NULL,
    title            VARCHAR(200)    NOT NULL,
    liturgical_color VARCHAR(30)     NOT NULL,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE mass_schedules IS 'Mass events linked to a chapel and optionally a choir.';
COMMENT ON COLUMN mass_schedules.liturgical_color IS 'Hex color code matching the liturgical season (e.g. #0284C7).';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS membership_requests (
    id           SERIAL PRIMARY KEY,
    full_name    VARCHAR(150)    NOT NULL,
    choir_name   VARCHAR(150)    NOT NULL,
    chapel_id    INT             NOT NULL REFERENCES chapels(id) ON DELETE CASCADE,
    status       choir_status    NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by  INT             REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at  TIMESTAMPTZ
);

COMMENT ON TABLE membership_requests IS 'Public form submissions for choir membership, subject to ADMIN review.';

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS liturgical_settings (
    id            SERIAL PRIMARY KEY,
    current_color VARCHAR(30)     NOT NULL DEFAULT '#0284C7',
    active_season VARCHAR(100)    NOT NULL DEFAULT 'Ordinary Time',
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by    INT             REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE liturgical_settings IS 'Single-row table storing the active liturgical accent color and season label.';
COMMENT ON COLUMN liturgical_settings.current_color IS 'Hex color injected into --accent-color CSS variable on the frontend.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_mass_schedules_chapel_date
    ON mass_schedules(chapel_id, mass_date);

CREATE INDEX IF NOT EXISTS idx_mass_schedules_date_time
    ON mass_schedules(mass_date, mass_time);

CREATE INDEX IF NOT EXISTS idx_choirs_chapel_status
    ON choirs(chapel_id, status);

CREATE INDEX IF NOT EXISTS idx_membership_requests_status
    ON membership_requests(status);

CREATE INDEX IF NOT EXISTS idx_membership_requests_chapel
    ON membership_requests(chapel_id);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

INSERT INTO chapels (name, code, description) VALUES
    ('TUNGANE',  'TGN', 'Se rassembler'),
    ('USHINDI',  'USH', 'Victoire'),
    ('AMANI',    'AMN', 'Paix'),
    ('MAPENDO',  'MAP', 'Amour'),
    ('AMKENI',   'AMK', 'Éveiller'),
    ('UMOJA',    'UMJ', 'Unité'),
    ('TUNDA',    'TND', 'Porter du fruit'),
    ('MWANGAZA', 'MWG', 'Lumière')
ON CONFLICT (code) DO NOTHING;

INSERT INTO liturgical_settings (current_color, active_season)
    SELECT '#0284C7', 'Fêtes mariales'
    WHERE NOT EXISTS (SELECT 1 FROM liturgical_settings);
