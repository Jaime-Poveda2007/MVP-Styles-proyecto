-- ============================================================
-- Perfil de usuario (RF-U10/RF-U11) — piezas que faltaban para
-- edición de perfil propio (foto, username, biografía) y acceso a
-- editar preferencias de estilo.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Se puede correr varias veces sin romper nada (mismo criterio que
-- marcas_setup.sql / reseñas_setup.sql).
--
-- Nota: public.usuarios YA TIENE las columnas "biografia" y
-- "foto_url" (confirmado consultando la API en vivo) — este script
-- NO las crea, solo agrega el constraint de longitud que faltaba y
-- las policies necesarias para poder editarlas desde la app.
-- ============================================================

-- ─── 1. Constraint de longitud en biografía (máx. 150 caracteres) ───
DO $$
BEGIN
  ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_biografia_longitud CHECK (char_length(biografia) <= 150);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. RLS: cada persona puede editar su propia fila de usuarios ───
-- (nombre, username, biografia, foto_url). Antes de esto no había
-- ningún UPDATE en la app hacia "usuarios" fuera de onboarding_completo
-- (que ya lo actualiza OnboardingEstilo.tsx, así que la policy ya debe
-- existir para eso — se recrea igual de forma idempotente por si acaso).
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
CREATE POLICY "usuarios_update_own"
  ON public.usuarios FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- ─── 3. RLS: cada persona puede leer su propia fila de preferencias ───
-- OnboardingEstilo.tsx solo hacía upsert (nunca select) — la pantalla
-- de "editar preferencias" desde el perfil necesita poder leerla para
-- precargar la selección actual.
DROP POLICY IF EXISTS "preferencias_usuario_select_own" ON public.preferencias_usuario;
CREATE POLICY "preferencias_usuario_select_own"
  ON public.preferencias_usuario FOR SELECT
  USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- ─── 4. Storage: bucket "avatars" ─────────────────────────────────────
-- Mismo criterio que los buckets "publicaciones"/"prendas": público
-- para lectura, cada persona solo puede subir/editar/borrar dentro de
-- su propia carpeta ({auth_id}/avatar.jpg). A diferencia del bucket
-- "prendas" (que necesita una subquery a public.marcas para saber la
-- carpeta dueña), acá la carpeta ES directamente auth.uid(), sin
-- subquery, porque perfil.api.ts sube a `${authUserId}/avatar.jpg`.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_storage_select_public" ON storage.objects;
CREATE POLICY "avatars_storage_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_storage_insert_own" ON storage.objects;
CREATE POLICY "avatars_storage_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_storage_update_own" ON storage.objects;
CREATE POLICY "avatars_storage_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_storage_delete_own" ON storage.objects;
CREATE POLICY "avatars_storage_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Refrescar el cache de PostgREST
NOTIFY pgrst, 'reload schema';
