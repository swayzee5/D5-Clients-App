-- Migration 001: Replace structured nutrition tables with file-based system
-- Run this INSTEAD of the original nutrition tables in schema.sql
-- Coach uploads PDFs from CRM → stored in Vercel Blob → referenced here

-- Drop original nutrition tables if they were created
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS nutrition_days CASCADE;
DROP TABLE IF EXISTS nutrition_plans CASCADE;

-- Nutrition files (one or more PDFs per client)
CREATE TABLE IF NOT EXISTS nutrition_files (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,        -- label visible par le client, ex: "Plan semaine 1"
  file_url    TEXT         NOT NULL,        -- URL Vercel Blob (publique)
  file_name   VARCHAR(255) NOT NULL,        -- nom original du fichier
  file_size   INT,                          -- taille en octets
  uploaded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN      NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_nutrition_files_client
  ON nutrition_files(client_id, uploaded_at DESC);
