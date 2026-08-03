-- ============================================================
-- Panel de métricas de marca (RF-M05) — tabla de tracking de clics
-- en "Ver en tienda" por prenda. Los demás datos del panel (número
-- de etiquetados, likes/reposts totales) se calculan con consultas
-- en vivo (COUNT) directamente sobre etiquetas/likes/reposts/
-- publicaciones — no hay tabla "metricas_marca" ni Edge Functions:
-- decisión de producto para mantener el MVP simple (equipo de 2
-- personas, presupuesto $0, sin infraestructura de Edge Functions
-- existente en el proyecto).
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Se puede correr varias veces sin romper nada (mismo criterio que
-- marcas_setup.sql / reseñas_setup.sql).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clics_tienda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prenda_id uuid NOT NULL REFERENCES public.prendas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clics_tienda ENABLE ROW LEVEL SECURITY;

-- Cualquier persona autenticada puede registrar un clic en "Ver en
-- tienda" sobre CUALQUIER prenda (es una acción de quien compra,
-- registrada en beneficio de la marca dueña de la prenda — no es
-- información propia de quien hace clic).
DROP POLICY IF EXISTS "clics_tienda_insert_any_auth" ON public.clics_tienda;
CREATE POLICY "clics_tienda_insert_any_auth"
  ON public.clics_tienda FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Solo la marca dueña de la prenda puede leer sus propios clics
-- (mismo patrón de subquery que "prendas_select_own_marca" en
-- marcas_setup.sql).
DROP POLICY IF EXISTS "clics_tienda_select_own_marca" ON public.clics_tienda;
CREATE POLICY "clics_tienda_select_own_marca"
  ON public.clics_tienda FOR SELECT
  USING (
    prenda_id IN (
      SELECT id FROM public.prendas
      WHERE marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
    )
  );

-- Índice para acelerar los COUNT agrupados por prenda + rango de fecha
-- que usa el panel de métricas.
CREATE INDEX IF NOT EXISTS clics_tienda_prenda_fecha_idx
  ON public.clics_tienda (prenda_id, created_at);

-- Refrescar el cache de PostgREST
NOTIFY pgrst, 'reload schema';

-- Nota: confirmado en vivo (vía la API REST con la anon key) que
-- public.likes SÍ tiene columna created_at, así que el filtro de
-- fecha del panel de métricas (última semana / último mes) puede
-- aplicarse directamente sobre likes.created_at sin aproximaciones.
