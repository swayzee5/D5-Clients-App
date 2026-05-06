-- Migration 002: Exercise Library
-- Run after 001_nutrition_files.sql
-- Adds a global exercise library managed by the coach in the CRM

-- Global exercise library
CREATE TABLE IF NOT EXISTS exercise_library (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  muscles        TEXT[]       NOT NULL DEFAULT '{}',
  vimeo_video_id VARCHAR(50),
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_name ON exercise_library(name);
CREATE INDEX IF NOT EXISTS idx_exercise_library_active ON exercise_library(is_active);

-- Add weeks_duration to training_programs
ALTER TABLE training_programs
  ADD COLUMN IF NOT EXISTS weeks_duration SMALLINT;

-- Link session exercises to the library (optional)
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS library_exercise_id UUID
    REFERENCES exercise_library(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_library
  ON exercises(library_exercise_id)
  WHERE library_exercise_id IS NOT NULL;
