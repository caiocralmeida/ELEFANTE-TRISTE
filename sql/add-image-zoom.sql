-- Adiciona zoom independente para as imagens de cada área do site.
-- Execute uma única vez no SQL Editor do Supabase.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS home_zoom smallint NOT NULL DEFAULT 100 CHECK (home_zoom BETWEEN 100 AND 200),
  ADD COLUMN IF NOT EXISTS catalog_zoom smallint NOT NULL DEFAULT 100 CHECK (catalog_zoom BETWEEN 100 AND 200),
  ADD COLUMN IF NOT EXISTS detail_zoom smallint NOT NULL DEFAULT 100 CHECK (detail_zoom BETWEEN 100 AND 200);
