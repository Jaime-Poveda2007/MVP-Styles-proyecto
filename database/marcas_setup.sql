-- ============================================================
-- Panel de marcas (RF-M01/RF-M02/RF-M03) — piezas que faltaban en
-- styles_database.sql para que el catálogo funcione desde la app.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Se puede correr varias veces sin romper nada (usa IF NOT EXISTS /
-- DROP POLICY IF EXISTS, mismo criterio que supabase_realtime_likes.sql).
-- ============================================================

-- ─── 1. RLS: la marca debe ver TODO su catálogo, no solo lo activo ───
-- styles_database.sql ya trae "prendas_select_activas" (activa = TRUE),
-- necesaria para que cualquier persona/usuario busque y etiquete
-- prendas activas. Pero el panel de la marca (PCatalogo.tsx) también
-- necesita listar sus prendas DESACTIVADAS para poder reactivarlas
-- (RF-M03), y esa policy no se las muestra. Se agrega una policy
-- adicional (las policies de SELECT se combinan con OR).
DROP POLICY IF EXISTS "prendas_select_own_marca" ON public.prendas;
CREATE POLICY "prendas_select_own_marca"
  ON public.prendas FOR SELECT
  USING (
    marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
  );

-- ─── 2. Storage: bucket "prendas" ─────────────────────────────────────
-- Mismo criterio que el bucket "publicaciones" que ya usa el feed:
-- público para lectura (las imágenes de producto se muestran en el
-- feed/etiquetas a cualquier persona), y solo la propia marca puede
-- subir/editar/borrar dentro de su propia carpeta ({marca_id}/...).
INSERT INTO storage.buckets (id, name, public)
VALUES ('prendas', 'prendas', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "prendas_storage_select_public" ON storage.objects;
CREATE POLICY "prendas_storage_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prendas');

DROP POLICY IF EXISTS "prendas_storage_insert_own_marca" ON storage.objects;
CREATE POLICY "prendas_storage_insert_own_marca"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prendas'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.marcas WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "prendas_storage_update_own_marca" ON storage.objects;
CREATE POLICY "prendas_storage_update_own_marca"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'prendas'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.marcas WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "prendas_storage_delete_own_marca" ON storage.objects;
CREATE POLICY "prendas_storage_delete_own_marca"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'prendas'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.marcas WHERE auth_id = auth.uid()
    )
  );

-- ============================================================
-- 3. NIT/RUT opcional (temporal)
-- ============================================================
-- Se decidió omitir el campo NIT/RUT del registro de marca por ahora
-- (ver roadmap RF-M01: se retomará más adelante). La columna se deja
-- en la tabla para no perder el dato cuando se reactive, solo se
-- vuelve opcional. Como es NULLABLE, Postgres permite múltiples NULL
-- sin romper la restricción UNIQUE existente.
ALTER TABLE public.marcas ALTER COLUMN nit_rut DROP NOT NULL;

-- ============================================================
-- Nota sobre el estado de aprobación (temporal)
-- ============================================================
-- Mientras el flujo de aprobación manual esté desactivado en la app
-- (ver src/lib/marcaPerfil.ts), las marcas nuevas se crean directo con
-- estado = 'aprobada'. No se requiere ningún cambio de esquema para
-- esto: el default de la columna sigue siendo 'pendiente' por si en
-- algún punto se inserta manualmente o se reactiva el flujo.

