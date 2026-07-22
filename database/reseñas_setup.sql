-- ============================================================
-- RF-C02: Reseñas de PRENDAS (no de publicaciones/outfits).
-- La reseña vive contra public.prendas(id) porque una misma prenda
-- del catálogo puede aparecer etiquetada en varias publicaciones de
-- la marca, y el promedio debe ser el mismo en todas.
--
-- Se recrea desde cero (DROP + CREATE) porque la tabla anterior
-- apuntaba mal (a publicaciones) y no tiene datos guardados todavía
-- (todos los intentos de insert fallaron con 400).
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

DROP TABLE IF EXISTS public.reseñas CASCADE;

CREATE TABLE public.reseñas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prenda_id uuid NOT NULL REFERENCES public.prendas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estrellas smallint NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario varchar(200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prenda_id, usuario_id)  -- una reseña por usuario por prenda
);

ALTER TABLE public.reseñas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resenas_select_public" ON public.reseñas;
CREATE POLICY "resenas_select_public" ON public.reseñas FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "resenas_insert_own" ON public.reseñas;
CREATE POLICY "resenas_insert_own" ON public.reseñas FOR INSERT
  WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "resenas_update_own" ON public.reseñas;
CREATE POLICY "resenas_update_own" ON public.reseñas FOR UPDATE
  USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "resenas_delete_own" ON public.reseñas;
CREATE POLICY "resenas_delete_own" ON public.reseñas FOR DELETE
  USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- Realtime, para que el promedio se recalcule solo (RNF 2.1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reseñas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reseñas;
  END IF;
END $$;

-- Refrescar el cache de PostgREST (evita el error PGRST204 que ya vimos)
NOTIFY pgrst, 'reload schema';

-- Verificación:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'reseñas';