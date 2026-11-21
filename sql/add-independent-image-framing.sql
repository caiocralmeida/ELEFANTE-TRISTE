-- Imagens e enquadramentos independentes para cada área do site.
-- Execute este arquivo uma única vez no Supabase SQL Editor.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS home_image_url text,
  ADD COLUMN IF NOT EXISTS home_fit text NOT NULL DEFAULT 'cover' CHECK (home_fit IN ('cover','contain')),
  ADD COLUMN IF NOT EXISTS home_position_x smallint NOT NULL DEFAULT 50 CHECK (home_position_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS home_position_y smallint NOT NULL DEFAULT 50 CHECK (home_position_y BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS catalog_image_url text,
  ADD COLUMN IF NOT EXISTS catalog_fit text NOT NULL DEFAULT 'cover' CHECK (catalog_fit IN ('cover','contain')),
  ADD COLUMN IF NOT EXISTS catalog_position_x smallint NOT NULL DEFAULT 50 CHECK (catalog_position_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS catalog_position_y smallint NOT NULL DEFAULT 50 CHECK (catalog_position_y BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS detail_image_url text,
  ADD COLUMN IF NOT EXISTS detail_fit text NOT NULL DEFAULT 'cover' CHECK (detail_fit IN ('cover','contain')),
  ADD COLUMN IF NOT EXISTS detail_position_x smallint NOT NULL DEFAULT 50 CHECK (detail_position_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS detail_position_y smallint NOT NULL DEFAULT 50 CHECK (detail_position_y BETWEEN 0 AND 100);

-- Copia o enquadramento antigo quando as colunas da migração anterior existirem.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='games' AND column_name='cover_fit')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='games' AND column_name='cover_position_x')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='games' AND column_name='cover_position_y') THEN
    EXECUTE 'UPDATE public.games SET
      home_fit = COALESCE(cover_fit, ''cover''),
      home_position_x = COALESCE(cover_position_x, 50),
      home_position_y = COALESCE(cover_position_y, 50),
      catalog_fit = COALESCE(cover_fit, ''cover''),
      catalog_position_x = COALESCE(cover_position_x, 50),
      catalog_position_y = COALESCE(cover_position_y, 50),
      detail_fit = COALESCE(cover_fit, ''cover''),
      detail_position_x = COALESCE(cover_position_x, 50),
      detail_position_y = COALESCE(cover_position_y, 50)';
  END IF;
END $$;
