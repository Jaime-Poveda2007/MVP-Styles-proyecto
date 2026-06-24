-- ============================================================
-- Habilitar Supabase Realtime para Likes (RF-U06)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- (o pegar como sección 6 al final de tu script principal)
--
-- styles_database.sql ya deja RLS abierto para SELECT en "likes"
-- (policy "likes_select_public" con USING (TRUE)), que es justo lo que
-- Realtime necesita para poder transmitir los cambios de esta tabla.
-- Lo único que falta es agregar la tabla a la publicación de Realtime.
--
-- Va envuelto en un DO $$ ... $$ con IF NOT EXISTS porque
-- "ALTER PUBLICATION ... ADD TABLE" lanza error si se corre dos veces
-- sobre la misma tabla — así el script se puede re-ejecutar sin romper,
-- igual que el resto de tu styles_database.sql.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  END IF;
END $$;

-- Verificación rápida (debe devolver una fila con "likes"):
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'likes';
