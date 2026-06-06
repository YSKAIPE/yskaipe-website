-- Phase 1b: add columns to jobs and job_claims tables
-- Run in Supabase SQL Editor BEFORE deploying the new API routes
-- Safe to run multiple times (IF NOT EXISTS guards)

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS task_slug        text,
  ADD COLUMN IF NOT EXISTS task_label       text,
  ADD COLUMN IF NOT EXISTS task_category    text,
  ADD COLUMN IF NOT EXISTS domain           text,
  ADD COLUMN IF NOT EXISTS tier_min         text,
  ADD COLUMN IF NOT EXISTS requires_license boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS permit_likely    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirm_number   text UNIQUE,
  ADD COLUMN IF NOT EXISTS zip_code         text,
  ADD COLUMN IF NOT EXISTS timing           text,
  ADD COLUMN IF NOT EXISTS fri_low          numeric(10,2),
  ADD COLUMN IF NOT EXISTS fri_high         numeric(10,2),
  ADD COLUMN IF NOT EXISTS fri_unit         text DEFAULT 'flat';

ALTER TABLE job_claims
  ADD COLUMN IF NOT EXISTS task_slug text;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('task_slug','tier_min','requires_license','confirm_number')
ORDER BY column_name;
