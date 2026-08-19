-- ============================================================================
-- STYLES APP DATABASE - SCRIPT FUENTE DE VERDAD CONSOLIDADO Y COMPLETO
-- Incluye: Extensions, 15 Tablas, Triggers, 32 Índices y 40 Políticas RLS
-- Idempotente: seguro de ejecutar múltiples veces (IF NOT EXISTS / DROP IF EXISTS)
-- ============================================================================

-- ============================================================
-- 0. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. TABLAS Y ENTIDADES (15 TABLAS)
-- ============================================================

-- 1.1 ESTILOS
CREATE TABLE IF NOT EXISTS public.estilos (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE
);

-- 1.2 INTENTOS DE LOGIN (Rate limiting / Seguridad)
CREATE TABLE IF NOT EXISTS public.intentos_login (
  email          TEXT PRIMARY KEY,
  intentos       INTEGER NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 USUARIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id             UUID        UNIQUE,
  nombre              TEXT        NOT NULL,
  email               TEXT        NOT NULL UNIQUE,
  username            TEXT        NOT NULL UNIQUE
                                    CHECK (char_length(username) BETWEEN 3 AND 30)
                                    CHECK (username ~ '^[a-zA-Z0-9_.]+$'),
  biografia           TEXT        CHECK (char_length(biografia) <= 150),
  foto_url            TEXT,
  fecha_nacimiento    DATE,
  email_confirmado    BOOLEAN     NOT NULL DEFAULT FALSE,
  onboarding_completo BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 PREFERENCIAS DE USUARIO (Onboarding)
CREATE TABLE IF NOT EXISTS public.preferencias_usuario (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estilos     TEXT[]      NOT NULL DEFAULT '{}',
  telas       TEXT[]      NOT NULL DEFAULT '{}',
  colores     TEXT[]      NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT preferencias_usuario_usuario_id_key UNIQUE (usuario_id)
);

-- 1.5 MARCAS
CREATE TABLE IF NOT EXISTS public.marcas (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id         UUID        UNIQUE,
  nombre          TEXT        NOT NULL,
  nit_rut         TEXT        NOT NULL UNIQUE,
  email_contacto  TEXT        NOT NULL UNIQUE,
  pais            TEXT        NOT NULL,
  ciudad          TEXT        NOT NULL,
  categoria       TEXT        NOT NULL
                                CHECK (categoria IN ('Mujer', 'Hombre', 'Unisex', 'Infantil')),
  estado          TEXT        NOT NULL DEFAULT 'pendiente'
                                CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  logo_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 PRENDAS (Catálogo de Marcas)
CREATE TABLE IF NOT EXISTS public.prendas (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca_id    UUID          NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  nombre      TEXT          NOT NULL,
  precio      NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  descripcion TEXT          CHECK (char_length(descripcion) <= 300),
  categoria   TEXT          NOT NULL
                              CHECK (categoria IN ('Camisas','Pantalones','Vestidos','Calzado','Accesorios','Otros')),
  imagen_url  TEXT,
  url_tienda  TEXT          CHECK (url_tienda ~ '^https?://'),
  activa      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 1.7 PUBLICACIONES (Feed)
CREATE TABLE IF NOT EXISTS public.publicaciones (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  marca_id    UUID        REFERENCES public.marcas(id)   ON DELETE SET NULL,
  imagen_url  TEXT        NOT NULL,
  descripcion TEXT        CHECK (char_length(descripcion) <= 300),
  es_de_marca BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT publicacion_tiene_autor CHECK (
    (usuario_id IS NOT NULL) OR (marca_id IS NOT NULL)
  )
);

-- 1.8 ETIQUETAS
CREATE TABLE IF NOT EXISTS public.etiquetas (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacion_id  UUID          NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  prenda_id       UUID          REFERENCES public.prendas(id) ON DELETE SET NULL,
  pos_x           FLOAT         NOT NULL CHECK (pos_x BETWEEN 0 AND 100),
  pos_y           FLOAT         NOT NULL CHECK (pos_y BETWEEN 0 AND 100),
  nombre_manual   TEXT,
  marca_manual    TEXT,
  precio_manual   NUMERIC(12,2),
  es_manual       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT etiqueta_valida CHECK (
    (es_manual = FALSE AND prenda_id IS NOT NULL) OR
    (es_manual = TRUE  AND nombre_manual IS NOT NULL)
  )
);

-- 1.9 LIKES
CREATE TABLE IF NOT EXISTS public.likes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID        NOT NULL REFERENCES public.usuarios(id)      ON DELETE CASCADE,
  publicacion_id  UUID        NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, publicacion_id)
);

-- 1.10 REPOSTS
CREATE TABLE IF NOT EXISTS public.reposts (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID        NOT NULL REFERENCES public.usuarios(id)      ON DELETE CASCADE,
  publicacion_id  UUID        NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, publicacion_id)
);

-- 1.11 COMENTARIOS
CREATE TABLE IF NOT EXISTS public.comentarios (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacion_id  UUID        NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  usuario_id      UUID        NOT NULL REFERENCES public.usuarios(id)      ON DELETE CASCADE,
  contenido       TEXT        NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 300),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.12 RESEÑAS
CREATE TABLE IF NOT EXISTS public.reseñas (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  prenda_id   UUID        NOT NULL REFERENCES public.prendas(id)  ON DELETE CASCADE,
  estrellas   SMALLINT    NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario  VARCHAR(200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, prenda_id)
);

-- 1.13 MÉTRICAS DE MARCA (Legacy / Reserva)
CREATE TABLE IF NOT EXISTS public.metricas_marca (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca_id      UUID        NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  prenda_id     UUID        REFERENCES public.prendas(id)         ON DELETE SET NULL,
  etiquetados   INTEGER     NOT NULL DEFAULT 0 CHECK (etiquetados  >= 0),
  clics_tienda  INTEGER     NOT NULL DEFAULT 0 CHECK (clics_tienda >= 0),
  periodo       TEXT        NOT NULL CHECK (periodo IN ('semana', 'mes')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.14 SEGUIMIENTOS
CREATE TABLE IF NOT EXISTS public.seguimientos (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  seguidor_id  UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  seguido_id   UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seguidor_id, seguido_id),
  CONSTRAINT no_self_follow CHECK (seguidor_id <> seguido_id)
);

-- 1.15 CLICS TIENDA (Registro de Analítica/Tráfico a Tiendas Externas)
CREATE TABLE IF NOT EXISTS public.clics_tienda (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  prenda_id   UUID        NOT NULL REFERENCES public.prendas(id) ON DELETE CASCADE,
  usuario_id  UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. FUNCIONES Y TRIGGERS AUTOMÁTICOS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at        ON public.usuarios;
DROP TRIGGER IF EXISTS trg_marcas_updated_at           ON public.marcas;
DROP TRIGGER IF EXISTS trg_prendas_updated_at          ON public.prendas;
DROP TRIGGER IF EXISTS trg_preferencias_updated_at     ON public.preferencias_usuario;
DROP TRIGGER IF EXISTS trg_comentarios_updated_at      ON public.comentarios;
DROP TRIGGER IF EXISTS trg_reseñas_updated_at          ON public.reseñas;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_marcas_updated_at
  BEFORE UPDATE ON public.marcas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_prendas_updated_at
  BEFORE UPDATE ON public.prendas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_preferencias_updated_at
  BEFORE UPDATE ON public.preferencias_usuario
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_comentarios_updated_at
  BEFORE UPDATE ON public.comentarios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_reseñas_updated_at
  BEFORE UPDATE ON public.reseñas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Función auxiliar para búsqueda de prendas por texto
CREATE OR REPLACE FUNCTION public.buscar_prendas(query_text TEXT)
RETURNS SETOF public.prendas AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.prendas
    WHERE nombre ILIKE '%' || query_text || '%'
       OR descripcion ILIKE '%' || query_text || '%';
END;
$$ LANGUAGE plpgsql STABLE;

-- Función auxiliar para obtener prendas recomendadas de la misma marca
CREATE OR REPLACE FUNCTION public.prendas_relacionadas(p_prenda_id UUID, p_limit INT DEFAULT 5)
RETURNS SETOF public.prendas AS $$
BEGIN
    RETURN QUERY
    SELECT p2.*
    FROM public.prendas p1
    JOIN public.prendas p2 ON p1.marca_id = p2.marca_id AND p2.id <> p1.id
    WHERE p1.id = p_prenda_id
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 3. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA (32 ÍNDICES)
-- ============================================================

-- usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON public.usuarios (username);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON public.usuarios (auth_id);

-- marcas
CREATE INDEX IF NOT EXISTS idx_marcas_estado ON public.marcas (estado);
CREATE INDEX IF NOT EXISTS idx_marcas_auth_id ON public.marcas (auth_id);
CREATE INDEX IF NOT EXISTS idx_marcas_nombre ON public.marcas USING gin (nombre gin_trgm_ops);

-- prendas
CREATE INDEX IF NOT EXISTS idx_prendas_marca_id ON public.prendas (marca_id);
CREATE INDEX IF NOT EXISTS idx_prendas_activa ON public.prendas (activa);
CREATE INDEX IF NOT EXISTS idx_prendas_nombre ON public.prendas USING gin (nombre gin_trgm_ops);

-- publicaciones
CREATE INDEX IF NOT EXISTS idx_publicaciones_usuario_id ON public.publicaciones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_marca_id ON public.publicaciones (marca_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_created_at ON public.publicaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_es_de_marca ON public.publicaciones (es_de_marca);
CREATE INDEX IF NOT EXISTS idx_publicaciones_descripcion ON public.publicaciones USING gin (descripcion gin_trgm_ops);

-- etiquetas
CREATE INDEX IF NOT EXISTS idx_etiquetas_publicacion_id ON public.etiquetas (publicacion_id);
CREATE INDEX IF NOT EXISTS idx_etiquetas_prenda_id ON public.etiquetas (prenda_id);

-- likes
CREATE INDEX IF NOT EXISTS idx_likes_publicacion_id ON public.likes (publicacion_id);
CREATE INDEX IF NOT EXISTS idx_likes_usuario_id ON public.likes (usuario_id);

-- reposts
CREATE INDEX IF NOT EXISTS idx_reposts_publicacion_id ON public.reposts (publicacion_id);
CREATE INDEX IF NOT EXISTS idx_reposts_usuario_id ON public.reposts (usuario_id);

-- comentarios
CREATE INDEX IF NOT EXISTS idx_comentarios_publicacion_id ON public.comentarios (publicacion_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario_id ON public.comentarios (usuario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_created_at ON public.comentarios (created_at DESC);

-- reseñas
CREATE INDEX IF NOT EXISTS idx_reseñas_prenda_id ON public.reseñas (prenda_id);
CREATE INDEX IF NOT EXISTS idx_reseñas_usuario_id ON public.reseñas (usuario_id);

-- metricas
CREATE INDEX IF NOT EXISTS idx_metricas_marca_id ON public.metricas_marca (marca_id);
CREATE INDEX IF NOT EXISTS idx_metricas_prenda_id ON public.metricas_marca (prenda_id);

-- seguimientos
CREATE INDEX IF NOT EXISTS idx_seguimientos_seguidor_id ON public.seguimientos (seguidor_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_seguido_id ON public.seguimientos (seguido_id);

-- clics_tienda
CREATE INDEX IF NOT EXISTS idx_clics_tienda_prenda_id ON public.clics_tienda (prenda_id);

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.estilos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intentos_login        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prendas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etiquetas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reposts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseñas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_marca       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimientos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clics_tienda         ENABLE ROW LEVEL SECURITY;

-- ─── ESTILOS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "estilos_select_public" ON public.estilos;
CREATE POLICY "estilos_select_public" ON public.estilos FOR SELECT USING (TRUE);

-- ─── USUARIOS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "usuarios_select_public" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own"    ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own"    ON public.usuarios;

CREATE POLICY "usuarios_select_public" ON public.usuarios FOR SELECT USING (TRUE);
CREATE POLICY "usuarios_insert_own"    ON public.usuarios FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "usuarios_update_own"    ON public.usuarios FOR UPDATE USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);

-- ─── PREFERENCIAS DE USUARIO ─────────────────────────────────
DROP POLICY IF EXISTS "preferencias_select_own" ON public.preferencias_usuario;
DROP POLICY IF EXISTS "preferencias_insert_own" ON public.preferencias_usuario;
DROP POLICY IF EXISTS "preferencias_update_own" ON public.preferencias_usuario;

CREATE POLICY "preferencias_select_own" ON public.preferencias_usuario FOR SELECT USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "preferencias_insert_own" ON public.preferencias_usuario FOR INSERT WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "preferencias_update_own" ON public.preferencias_usuario FOR UPDATE USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- ─── MARCAS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "marcas_select_aprobadas" ON public.marcas;
DROP POLICY IF EXISTS "marcas_insert_public"    ON public.marcas;
DROP POLICY IF EXISTS "marcas_update_own"       ON public.marcas;

CREATE POLICY "marcas_select_aprobadas" ON public.marcas FOR SELECT USING (estado = 'aprobada' OR auth_id = auth.uid());
CREATE POLICY "marcas_insert_public"    ON public.marcas FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "marcas_update_own"       ON public.marcas FOR UPDATE USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);

-- ─── PRENDAS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "prendas_select_activas"    ON public.prendas;
DROP POLICY IF EXISTS "prendas_insert_own_marca"  ON public.prendas;
DROP POLICY IF EXISTS "prendas_update_own_marca"  ON public.prendas;

CREATE POLICY "prendas_select_activas"   ON public.prendas FOR SELECT USING (activa = TRUE);
CREATE POLICY "prendas_insert_own_marca" ON public.prendas FOR INSERT WITH CHECK (marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid()));
CREATE POLICY "prendas_update_own_marca" ON public.prendas FOR UPDATE USING (marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid()));

-- ─── PUBLICACIONES ───────────────────────────────────────────
DROP POLICY IF EXISTS "publicaciones_select_public"   ON public.publicaciones;
DROP POLICY IF EXISTS "publicaciones_insert_usuario"  ON public.publicaciones;
DROP POLICY IF EXISTS "publicaciones_update_own"      ON public.publicaciones;
DROP POLICY IF EXISTS "publicaciones_delete_own"      ON public.publicaciones;

CREATE POLICY "publicaciones_select_public" ON public.publicaciones FOR SELECT USING (TRUE);
CREATE POLICY "publicaciones_insert_usuario" ON public.publicaciones FOR INSERT WITH CHECK (
  (es_de_marca = FALSE AND usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()))
  OR
  (es_de_marca = TRUE  AND marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid()))
);
CREATE POLICY "publicaciones_update_own" ON public.publicaciones FOR UPDATE USING (
  usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()) OR marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
);
CREATE POLICY "publicaciones_delete_own" ON public.publicaciones FOR DELETE USING (
  usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()) OR marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
);

-- ─── ETIQUETAS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "etiquetas_select_public" ON public.etiquetas;
DROP POLICY IF EXISTS "etiquetas_insert_autor"  ON public.etiquetas;
DROP POLICY IF EXISTS "etiquetas_delete_autor"  ON public.etiquetas;

CREATE POLICY "etiquetas_select_public" ON public.etiquetas FOR SELECT USING (TRUE);
CREATE POLICY "etiquetas_insert_autor" ON public.etiquetas FOR INSERT WITH CHECK (
  publicacion_id IN (
    SELECT id FROM public.publicaciones
    WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
       OR marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid())
  )
);
CREATE POLICY "etiquetas_delete_autor" ON public.etiquetas FOR DELETE USING (
  publicacion_id IN (
    SELECT id FROM public.publicaciones
    WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
       OR marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid())
  )
);

-- ─── LIKES ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "likes_select_public" ON public.likes;
DROP POLICY IF EXISTS "likes_insert_own"    ON public.likes;
DROP POLICY IF EXISTS "likes_delete_own"    ON public.likes;

CREATE POLICY "likes_select_public" ON public.likes FOR SELECT USING (TRUE);
CREATE POLICY "likes_insert_own"    ON public.likes FOR INSERT WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "likes_delete_own"    ON public.likes FOR DELETE USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- ─── REPOSTS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "reposts_select_public" ON public.reposts;
DROP POLICY IF EXISTS "reposts_insert_own"    ON public.reposts;
DROP POLICY IF EXISTS "reposts_delete_own"    ON public.reposts;

CREATE POLICY "reposts_select_public" ON public.reposts FOR SELECT USING (TRUE);
CREATE POLICY "reposts_insert_own"    ON public.reposts FOR INSERT WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "reposts_delete_own"    ON public.reposts FOR DELETE USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- ─── COMENTARIOS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "comentarios_select_public" ON public.comentarios;
DROP POLICY IF EXISTS "comentarios_insert_own"    ON public.comentarios;
DROP POLICY IF EXISTS "comentarios_update_own"    ON public.comentarios;
DROP POLICY IF EXISTS "comentarios_delete_own"    ON public.comentarios;

CREATE POLICY "comentarios_select_public" ON public.comentarios FOR SELECT USING (TRUE);
CREATE POLICY "comentarios_insert_own"    ON public.comentarios FOR INSERT WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "comentarios_update_own"    ON public.comentarios FOR UPDATE USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())) WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "comentarios_delete_own"    ON public.comentarios FOR DELETE USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- ─── RESEÑAS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "resenas_select_public" ON public.reseñas;
DROP POLICY IF EXISTS "resenas_insert_own"    ON public.reseñas;
DROP POLICY IF EXISTS "resenas_update_own"    ON public.reseñas;
DROP POLICY IF EXISTS "resenas_delete_own"    ON public.reseñas;

CREATE POLICY "resenas_select_public" ON public.reseñas FOR SELECT USING (TRUE);
CREATE POLICY "resenas_insert_own"    ON public.reseñas FOR INSERT WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "resenas_update_own"    ON public.reseñas FOR UPDATE USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "resenas_delete_own"    ON public.reseñas FOR DELETE USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- ─── SEGUIMIENTOS ────────────────────────────────────────────
DROP POLICY IF EXISTS "seguimientos_select_public" ON public.seguimientos;
DROP POLICY IF EXISTS "seguimientos_insert_own"    ON public.seguimientos;
DROP POLICY IF EXISTS "seguimientos_delete_own"    ON public.seguimientos;

CREATE POLICY "seguimientos_select_public" ON public.seguimientos FOR SELECT USING (TRUE);
CREATE POLICY "seguimientos_insert_own"    ON public.seguimientos FOR INSERT WITH CHECK (seguidor_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY "seguimientos_delete_own"    ON public.seguimientos FOR DELETE USING (seguidor_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- ─── CLICS TIENDA ────────────────────────────────────────────
DROP POLICY IF EXISTS "clics_tienda_insert_public"   ON public.clics_tienda;
DROP POLICY IF EXISTS "clics_tienda_select_own_marca" ON public.clics_tienda;

CREATE POLICY "clics_tienda_insert_public" ON public.clics_tienda FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "clics_tienda_select_own_marca" ON public.clics_tienda FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.prendas p
    JOIN public.marcas m ON p.marca_id = m.id
    WHERE p.id = clics_tienda.prenda_id AND m.auth_id = auth.uid()
  )
);

-- ─── MÉTRICAS DE MARCA (Tabla Legacy) ────────────────────────
DROP POLICY IF EXISTS "metricas_select_own_marca" ON public.metricas_marca;
DROP POLICY IF EXISTS "metricas_insert_service"   ON public.metricas_marca;
DROP POLICY IF EXISTS "metricas_update_service"   ON public.metricas_marca;

CREATE POLICY "metricas_select_own_marca" ON public.metricas_marca FOR SELECT USING (marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid()));
CREATE POLICY "metricas_insert_service"   ON public.metricas_marca FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "metricas_update_service"   ON public.metricas_marca FOR UPDATE USING (auth.role() = 'service_role');