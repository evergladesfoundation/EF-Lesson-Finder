-- Inferred from the live Lesson Finder n8n workflows (WF1/WF2/WF4).
-- Applied 2026-08-18: seen_this_run plus lesson_assets / servable_assets / sync_state
-- via n8n/migrations/001_wf1_pipeline.sql. Education-owned columns were not changed.

-- lessons: Education-owned narrative columns are never overwritten by WF1.
-- WF1 only upserts identity / Drive location / derived status / machine_notes.

CREATE TABLE IF NOT EXISTS lessons (
  lesson_id      text PRIMARY KEY,          -- e.g. PK.1, K.2, 3.3, HS.OW.1
  folder_id      text,
  grade_label    text,
  grade_sort     integer,                   -- Pre-K=-1, K=0, 1-8=N, 9-12 units=9
  unit           text,                      -- 9-12 unit name, else null
  lesson_number  integer,
  title          text,
  lesson_url     text,
  status         text,                      -- Active | Draft | Under review | Retired
  machine_notes  text,
  summary        text,                      -- Education-owned
  topic_tags     text,                      -- Education-owned
  concepts       text,                      -- Education-owned (Fundamental Concepts)
  standards_raw  text,                      -- Education-owned
  theme          text,
  framework      text,
  seen_this_run  boolean,
  first_seen_at  timestamptz,
  last_seen_at   timestamptz
);

CREATE TABLE IF NOT EXISTS lesson_assets (
  file_id            text PRIMARY KEY,
  lesson_id          text REFERENCES lessons (lesson_id),
  asset_type         text,                  -- LessonPlan, Worksheet, ...
  language           text,                  -- en | es | ht
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
  needs_embedding    boolean
);

-- WF2 / WF4 read through this view (public, non-empty, no resourcekey).
-- CREATE VIEW servable_assets AS SELECT ... FROM lesson_assets
--   WHERE is_public AND file_size > 0 AND NOT needs_resourcekey;

CREATE TABLE IF NOT EXISTS grade_synonyms (
  synonym     text PRIMARY KEY,
  grade_sort  integer NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_standards (
  lesson_id text,
  code      text
);

CREATE TABLE IF NOT EXISTS ui_strings (
  key  text,
  lang text,                                 -- en | es | ht
  text text
);

CREATE TABLE IF NOT EXISTS query_log (
  session_id       text,
  query_text       text,
  response_preview text,
  had_results      boolean
);

CREATE TABLE IF NOT EXISTS sync_state (
  id               text PRIMARY KEY,         -- 'drive'
  last_run_at      timestamptz,
  last_run_status  text
);
