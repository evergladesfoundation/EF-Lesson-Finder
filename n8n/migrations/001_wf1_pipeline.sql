-- Lesson Finder WF1 pipeline objects.
-- Idempotent. Safe to re-run in the Supabase SQL editor.
-- Does not touch Education-owned columns (summary, topic_tags, concepts, standards_raw, framework, theme).

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS seen_this_run boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS lesson_assets (
  file_id            text PRIMARY KEY,
  lesson_id          text REFERENCES lessons (lesson_id),
  asset_type         text,
  language           text,
  title              text,
  mime_type          text,
  file_size          bigint,
  md5_checksum       text,
  view_url           text,
  download_url       text,
  is_public          boolean,
  is_primary         boolean,
  needs_resourcekey  boolean,
  owner_email        text,
  last_seen_at       timestamptz,
  needs_embedding    boolean NOT NULL DEFAULT false
);

ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS asset_type text;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS md5_checksum text;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS view_url text;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS download_url text;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS is_public boolean;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS is_primary boolean;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS needs_resourcekey boolean;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS owner_email text;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE lesson_assets ADD COLUMN IF NOT EXISTS needs_embedding boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW servable_assets AS
SELECT *
  FROM lesson_assets
 WHERE COALESCE(is_public, false)
   AND COALESCE(file_size, 0) > 0
   AND COALESCE(needs_resourcekey, false) = false;

CREATE TABLE IF NOT EXISTS sync_state (
  id               text PRIMARY KEY,
  last_run_at      timestamptz,
  last_run_status  text
);

INSERT INTO sync_state (id, last_run_status)
VALUES ('drive', 'never')
ON CONFLICT (id) DO NOTHING;
