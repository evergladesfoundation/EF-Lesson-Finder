-- Everglades Lesson Finder — canonical Postgres schema
--
-- The live Supabase project already has this applied and grade_synonyms is
-- populated. Run this only on a new database. Statements are idempotent.
--
-- Grade encoding matches widget/src/types.ts and widget/src/search.ts:
--   PreK = -1, Kindergarten = 0, Grade N = N.

CREATE TABLE IF NOT EXISTS lessons (
  id                   text PRIMARY KEY,
  title                text NOT NULL,
  grade_range          text NOT NULL,
  grade_min            integer NOT NULL,
  grade_max            integer NOT NULL,
  topics               text[] NOT NULL DEFAULT '{}',
  ngsss_standards      text[] NOT NULL DEFAULT '{}',
  fundamental_concept  text,
  summary              text,
  lesson_url           text,
  pdf_url              text,
  drive_file_id        text,
  source_updated_at    timestamptz,
  indexed_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lessons_grade_band_chk CHECK (grade_min <= grade_max)
);

CREATE INDEX IF NOT EXISTS lessons_grade_band_idx
  ON lessons (grade_min, grade_max);

CREATE INDEX IF NOT EXISTS lessons_standards_idx
  ON lessons USING gin (ngsss_standards);

CREATE INDEX IF NOT EXISTS lessons_topics_idx
  ON lessons USING gin (topics);

CREATE TABLE IF NOT EXISTS grade_synonyms (
  phrase      text PRIMARY KEY,
  grade_value integer NOT NULL
);

INSERT INTO grade_synonyms (phrase, grade_value) VALUES
  ('prek', -1),
  ('pre-k', -1),
  ('preschool', -1),
  ('kindergarten', 0),
  ('k', 0)
ON CONFLICT (phrase) DO NOTHING;

COMMENT ON TABLE lessons IS 'Teacher Toolkit catalog indexed by n8n WF1/WF2; shape matches widget Lesson type.';
COMMENT ON TABLE grade_synonyms IS 'Maps free-text grade phrases to grade_min/grade_max integers (PreK=-1, K=0).';
