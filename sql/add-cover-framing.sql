-- Enquadramento individual das capas dos jogos.
-- Execute uma única vez no Supabase SQL Editor.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS cover_fit text NOT NULL DEFAULT 'cover'
    CHECK (cover_fit IN ('cover','contain')),
  ADD COLUMN IF NOT EXISTS cover_position_x smallint NOT NULL DEFAULT 50
    CHECK (cover_position_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS cover_position_y smallint NOT NULL DEFAULT 50
    CHECK (cover_position_y BETWEEN 0 AND 100);
