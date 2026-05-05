-- D5 Coaching — Client App Database Schema
-- PostgreSQL on Neon (shared database with CRM)
-- Run once to initialize tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- CLIENTS (app users)
-- =============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  phone             VARCHAR(20),
  birth_date        DATE,
  gender            VARCHAR(20),
  objectives        TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  is_reboot_only    BOOLEAN     NOT NULL DEFAULT false,
  reboot_start_date DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TRAINING
-- =============================================================
CREATE TABLE IF NOT EXISTS training_programs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id       UUID        NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  day_of_week      SMALLINT    CHECK (day_of_week BETWEEN 0 AND 6),
  order_index      INT         NOT NULL DEFAULT 0,
  duration_minutes INT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercises (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  sets           SMALLINT,
  reps           VARCHAR(50),
  rest_seconds   SMALLINT,
  vimeo_video_id VARCHAR(50),
  order_index    INT         NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- NUTRITION — fichiers PDF uploadés depuis le CRM
-- (voir migration 001_nutrition_files.sql)
-- =============================================================
CREATE TABLE IF NOT EXISTS nutrition_files (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  file_url    TEXT         NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_size   INT,
  uploaded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN      NOT NULL DEFAULT true
);

-- =============================================================
-- PROGRESS TRACKING
-- =============================================================
CREATE TABLE IF NOT EXISTS progress_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entry_date       DATE        NOT NULL,
  weight_kg        DECIMAL(5,2),
  body_fat_percent DECIMAL(4,1),
  chest_cm         DECIMAL(5,1),
  waist_cm         DECIMAL(5,1),
  hips_cm          DECIMAL(5,1),
  arms_cm          DECIMAL(5,1),
  thighs_cm        DECIMAL(5,1),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, entry_date)
);

CREATE TABLE IF NOT EXISTS progress_photos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_entry_id UUID        NOT NULL REFERENCES progress_entries(id) ON DELETE CASCADE,
  photo_url         TEXT        NOT NULL,
  photo_type        VARCHAR(20) CHECK (photo_type IN ('front', 'back', 'side')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- REBOOT 40+ CHALLENGE
-- =============================================================
CREATE TABLE IF NOT EXISTS reboot_days (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number     SMALLINT    NOT NULL UNIQUE CHECK (day_number BETWEEN 1 AND 7),
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  vimeo_video_id VARCHAR(50),
  content_html   TEXT,
  order_index    INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_reboot_progress (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  reboot_day_id UUID        NOT NULL REFERENCES reboot_days(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, reboot_day_id)
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_training_programs_client ON training_programs(client_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_program ON training_sessions(program_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exercises_session ON exercises(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_nutrition_files_client ON nutrition_files(client_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_entries_client ON progress_entries(client_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_entry ON progress_photos(progress_entry_id);
CREATE INDEX IF NOT EXISTS idx_reboot_progress_client ON client_reboot_progress(client_id);

-- =============================================================
-- TRIGGER: auto-update updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients', 'training_programs', 'reboot_days']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
