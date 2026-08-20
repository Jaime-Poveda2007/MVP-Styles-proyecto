-- ============================================================
-- Script principal de la base de datos (Supabase / Postgres).
-- Guardado en el repo por primera vez: existía solo en el SQL
-- Editor de Supabase, y los demás scripts de esta carpeta
-- (marcas_setup.sql, perfil_setup.sql, metricas_marca_setup.sql,
-- reseñas_setup.sql, supabase_realtime_likes.sql) ya lo referencian
-- por nombre como "styles_database.sql" asumiendo que existía acá.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Se puede correr varias veces sin romper nada (usa IF NOT EXISTS /
-- DROP POLICY IF EXISTS, mismo criterio que el resto de scripts de
-- esta carpeta).
--
-- Orden de ejecución de TODA la carpeta database/ desde cero:
--   1. styles_database.sql          (este archivo)
--   2. supabase_realtime_likes.sql
--   3. marcas_setup.sql
--   4. perfil_setup.sql
--   5. metricas_marca_setup.sql
--   6. reseñas_setup.sql
--
-- Tablas (12):
--   usuarios, preferencias_usuario, marcas, prendas,
--   publicaciones, etiquetas, likes, reposts, comentarios,
--   reseñas, metricas_marca, seguimientos
-- ============================================================


-- ============================================================
-- 0. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- 1. TABLAS
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1.1 USUARIOS
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 1.2 PREFERENCIAS DE USUARIO (onboarding)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.preferencias_usuario (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estilos     TEXT[]      NOT NULL DEFAULT '{}',
  telas       TEXT[]      NOT NULL DEFAULT '{}',
  colores     TEXT[]      NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id)
);

-- ─────────────────────────────────────────────────────────────
-- 1.3 MARCAS
-- ─────────────────────────────────────────────────────────────
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
  descripcion     TEXT        CHECK (char_length(descripcion) <= 150),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migración idempotente: marcas.descripcion (bio de marca). Si la tabla
-- ya existía sin esta columna, se agrega y se le pone el mismo CHECK
-- que tendría una instalación nueva. No hace falta tocar RLS: la
-- política marcas_update_own ya cubre cualquier columna de la fila
-- propia.
ALTER TABLE public.marcas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE public.marcas DROP CONSTRAINT IF EXISTS marcas_descripcion_length_check;
ALTER TABLE public.marcas ADD CONSTRAINT marcas_descripcion_length_check CHECK (char_length(descripcion) <= 150);

-- ─────────────────────────────────────────────────────────────
-- 1.4 PRENDAS (catálogo de marcas)
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 1.5 PUBLICACIONES
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 1.6 ETIQUETAS (prenda + posición en imagen)
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 1.7 LIKES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.likes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID        REFERENCES public.usuarios(id)      ON DELETE CASCADE,
  marca_id        UUID        REFERENCES public.marcas(id)        ON DELETE CASCADE,
  publicacion_id  UUID        NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT likes_tiene_autor CHECK (
    (usuario_id IS NOT NULL AND marca_id IS NULL) OR
    (usuario_id IS NULL AND marca_id IS NOT NULL)
  ),
  UNIQUE (usuario_id, publicacion_id),
  UNIQUE (marca_id, publicacion_id)
);

-- ─────────────────────────────────────────────────────────────
-- 1.8 REPOSTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reposts (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID        REFERENCES public.usuarios(id)      ON DELETE CASCADE,
  marca_id        UUID        REFERENCES public.marcas(id)        ON DELETE CASCADE,
  publicacion_id  UUID        NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reposts_tiene_autor CHECK (
    (usuario_id IS NOT NULL AND marca_id IS NULL) OR
    (usuario_id IS NULL AND marca_id IS NOT NULL)
  ),
  UNIQUE (usuario_id, publicacion_id),
  UNIQUE (marca_id, publicacion_id)
);

-- ─────────────────────────────────────────────────────────────
-- 1.8.1 MIGRACIÓN IDEMPOTENTE: likes/reposts de marca
-- Si la tabla ya existía (creada antes de que la marca pudiera dar
-- like/repost), el CREATE TABLE de arriba es un no-op y estos ALTER
-- la ponen al día. Sobre una tabla recién creada, son no-ops también.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.likes   ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE public.reposts ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE public.likes   ADD COLUMN IF NOT EXISTS marca_id UUID REFERENCES public.marcas(id) ON DELETE CASCADE;
ALTER TABLE public.reposts ADD COLUMN IF NOT EXISTS marca_id UUID REFERENCES public.marcas(id) ON DELETE CASCADE;

ALTER TABLE public.likes   DROP CONSTRAINT IF EXISTS likes_tiene_autor;
ALTER TABLE public.likes   ADD CONSTRAINT likes_tiene_autor CHECK (
  (usuario_id IS NOT NULL AND marca_id IS NULL) OR (usuario_id IS NULL AND marca_id IS NOT NULL)
);
ALTER TABLE public.reposts DROP CONSTRAINT IF EXISTS reposts_tiene_autor;
ALTER TABLE public.reposts ADD CONSTRAINT reposts_tiene_autor CHECK (
  (usuario_id IS NOT NULL AND marca_id IS NULL) OR (usuario_id IS NULL AND marca_id IS NOT NULL)
);

ALTER TABLE public.likes   DROP CONSTRAINT IF EXISTS likes_marca_id_publicacion_id_key;
ALTER TABLE public.likes   ADD CONSTRAINT likes_marca_id_publicacion_id_key UNIQUE (marca_id, publicacion_id);
ALTER TABLE public.reposts DROP CONSTRAINT IF EXISTS reposts_marca_id_publicacion_id_key;
ALTER TABLE public.reposts ADD CONSTRAINT reposts_marca_id_publicacion_id_key UNIQUE (marca_id, publicacion_id);

-- ─────────────────────────────────────────────────────────────
-- 1.9 COMENTARIOS
-- Un usuario puede comentar varias veces en la misma publicación.
-- Máximo 300 caracteres por comentario.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comentarios (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  publicacion_id  UUID        NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  usuario_id      UUID        NOT NULL REFERENCES public.usuarios(id)      ON DELETE CASCADE,
  contenido       TEXT        NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 300),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 1.10 RESEÑAS
-- Definición vigente (ya aplicada vía reseñas_setup.sql: DROP +
-- CREATE de la tabla original, que apuntaba mal a publicaciones).
-- Se documenta acá con la forma final para que este archivo sea
-- una fuente de verdad segura de re-ejecutar completa.
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 1.11 MÉTRICAS DE MARCA
-- NOTA: tabla legacy, sin uso — metricas_marca_setup.sql documenta
-- que el panel de métricas (RF-M05) terminó implementándose con
-- COUNT() en vivo + la tabla public.clics_tienda en su lugar. Se
-- deja acá solo porque ya existe en producción.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.metricas_marca (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca_id      UUID        NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  prenda_id     UUID        REFERENCES public.prendas(id)         ON DELETE SET NULL,
  etiquetados   INTEGER     NOT NULL DEFAULT 0 CHECK (etiquetados  >= 0),
  clics_tienda  INTEGER     NOT NULL DEFAULT 0 CHECK (clics_tienda >= 0),
  periodo       TEXT        NOT NULL CHECK (periodo IN ('semana', 'mes')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 1.12 SEGUIMIENTOS (seguidores / seguidos)
-- Un usuario sigue a otro. No puede seguirse a sí mismo.
-- La combinación (seguidor_id + seguido_id) es única.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seguimientos (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  seguidor_id  UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  seguido_id   UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seguidor_id, seguido_id),
  CONSTRAINT no_self_follow CHECK (seguidor_id <> seguido_id)
);

-- ─────────────────────────────────────────────────────────────
-- 1.13 NOTIFICACIONES
-- Panel de notificaciones: like/repost recibidos (usuario o marca) y,
-- solo para marca, que etiqueten o reseñen una de sus prendas. Las
-- filas SOLO las crean los triggers de la sección "TRIGGERS DE
-- NOTIFICACIONES" (funciones SECURITY DEFINER) — no hay policy de
-- INSERT para clientes, así nadie puede falsificar una notificación
-- propia insertando directo desde la app.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id        UUID        REFERENCES public.usuarios(id) ON DELETE CASCADE,
  marca_id          UUID        REFERENCES public.marcas(id)   ON DELETE CASCADE,
  tipo              TEXT        NOT NULL CHECK (tipo IN ('like', 'repost', 'etiqueta', 'reseña')),
  actor_usuario_id  UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actor_marca_id    UUID        REFERENCES public.marcas(id)   ON DELETE SET NULL,
  publicacion_id    UUID        REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  prenda_id         UUID        REFERENCES public.prendas(id)  ON DELETE CASCADE,
  leida             BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notificaciones_tiene_destinatario CHECK (
    (usuario_id IS NOT NULL AND marca_id IS NULL) OR
    (usuario_id IS NULL AND marca_id IS NOT NULL)
  )
);


-- ============================================================
-- 2. FUNCIÓN updated_at
-- CREATE OR REPLACE reemplaza si ya existe, sin error.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 3. TRIGGERS updated_at
-- DROP IF EXISTS antes de cada CREATE para evitar el error
-- "trigger already exists" al volver a ejecutar el script.
-- ============================================================

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


-- ============================================================
-- 4. ÍNDICES
-- IF NOT EXISTS evita error si ya existen.
-- ============================================================

-- usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_username
  ON public.usuarios (username);
CREATE INDEX IF NOT EXISTS idx_usuarios_email
  ON public.usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id
  ON public.usuarios (auth_id);

-- marcas
CREATE INDEX IF NOT EXISTS idx_marcas_estado
  ON public.marcas (estado);
CREATE INDEX IF NOT EXISTS idx_marcas_auth_id
  ON public.marcas (auth_id);
CREATE INDEX IF NOT EXISTS idx_marcas_nombre
  ON public.marcas USING gin (nombre gin_trgm_ops);

-- prendas
CREATE INDEX IF NOT EXISTS idx_prendas_marca_id
  ON public.prendas (marca_id);
CREATE INDEX IF NOT EXISTS idx_prendas_activa
  ON public.prendas (activa);
CREATE INDEX IF NOT EXISTS idx_prendas_nombre
  ON public.prendas USING gin (nombre gin_trgm_ops);

-- publicaciones
CREATE INDEX IF NOT EXISTS idx_publicaciones_usuario_id
  ON public.publicaciones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_marca_id
  ON public.publicaciones (marca_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_created_at
  ON public.publicaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_es_de_marca
  ON public.publicaciones (es_de_marca);
CREATE INDEX IF NOT EXISTS idx_publicaciones_descripcion
  ON public.publicaciones USING gin (descripcion gin_trgm_ops);

-- etiquetas
CREATE INDEX IF NOT EXISTS idx_etiquetas_publicacion_id
  ON public.etiquetas (publicacion_id);
CREATE INDEX IF NOT EXISTS idx_etiquetas_prenda_id
  ON public.etiquetas (prenda_id);

-- likes
CREATE INDEX IF NOT EXISTS idx_likes_publicacion_id
  ON public.likes (publicacion_id);
CREATE INDEX IF NOT EXISTS idx_likes_usuario_id
  ON public.likes (usuario_id);

-- reposts
CREATE INDEX IF NOT EXISTS idx_reposts_publicacion_id
  ON public.reposts (publicacion_id);
CREATE INDEX IF NOT EXISTS idx_reposts_usuario_id
  ON public.reposts (usuario_id);

-- comentarios
CREATE INDEX IF NOT EXISTS idx_comentarios_publicacion_id
  ON public.comentarios (publicacion_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario_id
  ON public.comentarios (usuario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_created_at
  ON public.comentarios (created_at DESC);

-- reseñas
CREATE INDEX IF NOT EXISTS idx_reseñas_prenda_id
  ON public.reseñas (prenda_id);
CREATE INDEX IF NOT EXISTS idx_reseñas_usuario_id
  ON public.reseñas (usuario_id);

-- metricas
CREATE INDEX IF NOT EXISTS idx_metricas_marca_id
  ON public.metricas_marca (marca_id);
CREATE INDEX IF NOT EXISTS idx_metricas_prenda_id
  ON public.metricas_marca (prenda_id);

-- seguimientos
CREATE INDEX IF NOT EXISTS idx_seguimientos_seguidor_id
  ON public.seguimientos (seguidor_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_seguido_id
  ON public.seguimientos (seguido_id);

-- notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_id
  ON public.notificaciones (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_marca_id
  ON public.notificaciones (marca_id, created_at DESC);


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

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


-- ─── USUARIOS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "usuarios_select_public" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own"    ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own"    ON public.usuarios;

CREATE POLICY "usuarios_select_public"
  ON public.usuarios FOR SELECT
  USING (TRUE);

CREATE POLICY "usuarios_insert_own"
  ON public.usuarios FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "usuarios_update_own"
  ON public.usuarios FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);


-- ─── PREFERENCIAS DE USUARIO ─────────────────────────────────
DROP POLICY IF EXISTS "preferencias_select_own" ON public.preferencias_usuario;
DROP POLICY IF EXISTS "preferencias_insert_own" ON public.preferencias_usuario;
DROP POLICY IF EXISTS "preferencias_update_own" ON public.preferencias_usuario;

CREATE POLICY "preferencias_select_own"
  ON public.preferencias_usuario FOR SELECT
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );

CREATE POLICY "preferencias_insert_own"
  ON public.preferencias_usuario FOR INSERT
  WITH CHECK (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );

CREATE POLICY "preferencias_update_own"
  ON public.preferencias_usuario FOR UPDATE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );


-- ─── MARCAS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "marcas_select_aprobadas" ON public.marcas;
DROP POLICY IF EXISTS "marcas_insert_public"    ON public.marcas;
DROP POLICY IF EXISTS "marcas_update_own"       ON public.marcas;

CREATE POLICY "marcas_select_aprobadas"
  ON public.marcas FOR SELECT
  USING (estado = 'aprobada');

CREATE POLICY "marcas_insert_public"
  ON public.marcas FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "marcas_update_own"
  ON public.marcas FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);


-- ─── PRENDAS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "prendas_select_activas"    ON public.prendas;
DROP POLICY IF EXISTS "prendas_insert_own_marca"  ON public.prendas;
DROP POLICY IF EXISTS "prendas_update_own_marca"  ON public.prendas;

CREATE POLICY "prendas_select_activas"
  ON public.prendas FOR SELECT
  USING (activa = TRUE);

CREATE POLICY "prendas_insert_own_marca"
  ON public.prendas FOR INSERT
  WITH CHECK (
    marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
  );

CREATE POLICY "prendas_update_own_marca"
  ON public.prendas FOR UPDATE
  USING (
    marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
  );


-- ─── PUBLICACIONES ───────────────────────────────────────────
DROP POLICY IF EXISTS "publicaciones_select_public"   ON public.publicaciones;
DROP POLICY IF EXISTS "publicaciones_insert_usuario"  ON public.publicaciones;
DROP POLICY IF EXISTS "publicaciones_update_own"      ON public.publicaciones;
DROP POLICY IF EXISTS "publicaciones_delete_own"      ON public.publicaciones;

CREATE POLICY "publicaciones_select_public"
  ON public.publicaciones FOR SELECT
  USING (TRUE);

CREATE POLICY "publicaciones_insert_usuario"
  ON public.publicaciones FOR INSERT
  WITH CHECK (
    (es_de_marca = FALSE AND usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()))
    OR
    (es_de_marca = TRUE  AND marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid()))
  );

CREATE POLICY "publicaciones_update_own"
  ON public.publicaciones FOR UPDATE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    OR
    marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid())
  );

CREATE POLICY "publicaciones_delete_own"
  ON public.publicaciones FOR DELETE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    OR
    marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid())
  );


-- ─── ETIQUETAS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "etiquetas_select_public" ON public.etiquetas;
DROP POLICY IF EXISTS "etiquetas_insert_autor"  ON public.etiquetas;
DROP POLICY IF EXISTS "etiquetas_delete_autor"  ON public.etiquetas;

CREATE POLICY "etiquetas_select_public"
  ON public.etiquetas FOR SELECT
  USING (TRUE);

CREATE POLICY "etiquetas_insert_autor"
  ON public.etiquetas FOR INSERT
  WITH CHECK (
    publicacion_id IN (
      SELECT id FROM public.publicaciones
      WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
         OR marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "etiquetas_delete_autor"
  ON public.etiquetas FOR DELETE
  USING (
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

CREATE POLICY "likes_select_public"
  ON public.likes FOR SELECT USING (TRUE);

CREATE POLICY "likes_insert_own"
  ON public.likes FOR INSERT
  WITH CHECK (
    (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()) AND marca_id IS NULL)
    OR
    (marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid()) AND usuario_id IS NULL)
  );

CREATE POLICY "likes_delete_own"
  ON public.likes FOR DELETE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    OR
    marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid())
  );


-- ─── REPOSTS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "reposts_select_public" ON public.reposts;
DROP POLICY IF EXISTS "reposts_insert_own"    ON public.reposts;
DROP POLICY IF EXISTS "reposts_delete_own"    ON public.reposts;

CREATE POLICY "reposts_select_public"
  ON public.reposts FOR SELECT USING (TRUE);

CREATE POLICY "reposts_insert_own"
  ON public.reposts FOR INSERT
  WITH CHECK (
    (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()) AND marca_id IS NULL)
    OR
    (marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid()) AND usuario_id IS NULL)
  );

CREATE POLICY "reposts_delete_own"
  ON public.reposts FOR DELETE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    OR
    marca_id   = (SELECT id FROM public.marcas    WHERE auth_id = auth.uid())
  );


-- ─── COMENTARIOS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "comentarios_select_public" ON public.comentarios;
DROP POLICY IF EXISTS "comentarios_insert_own"    ON public.comentarios;
DROP POLICY IF EXISTS "comentarios_update_own"    ON public.comentarios;
DROP POLICY IF EXISTS "comentarios_delete_own"    ON public.comentarios;

CREATE POLICY "comentarios_select_public"
  ON public.comentarios FOR SELECT USING (TRUE);

CREATE POLICY "comentarios_insert_own"
  ON public.comentarios FOR INSERT
  WITH CHECK (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );

CREATE POLICY "comentarios_update_own"
  ON public.comentarios FOR UPDATE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );

CREATE POLICY "comentarios_delete_own"
  ON public.comentarios FOR DELETE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );


-- ─── RESEÑAS ─────────────────────────────────────────────────
-- Nombres de policy sin ñ ("resenas_*"), tal como los creó
-- reseñas_setup.sql — hay que mantener el mismo nombre acá para
-- que un re-run de este archivo actualice las mismas policies en
-- vez de crear duplicadas.
DROP POLICY IF EXISTS "resenas_select_public" ON public.reseñas;
DROP POLICY IF EXISTS "resenas_insert_own"    ON public.reseñas;
DROP POLICY IF EXISTS "resenas_update_own"    ON public.reseñas;
DROP POLICY IF EXISTS "resenas_delete_own"    ON public.reseñas;

CREATE POLICY "resenas_select_public"
  ON public.reseñas FOR SELECT USING (TRUE);

CREATE POLICY "resenas_insert_own"
  ON public.reseñas FOR INSERT
  WITH CHECK (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );

CREATE POLICY "resenas_update_own"
  ON public.reseñas FOR UPDATE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );

CREATE POLICY "resenas_delete_own"
  ON public.reseñas FOR DELETE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );


-- ─── MÉTRICAS DE MARCA (tabla legacy, sin uso real) ──────────
DROP POLICY IF EXISTS "metricas_select_own_marca" ON public.metricas_marca;
DROP POLICY IF EXISTS "metricas_insert_service"   ON public.metricas_marca;
DROP POLICY IF EXISTS "metricas_update_service"   ON public.metricas_marca;

CREATE POLICY "metricas_select_own_marca"
  ON public.metricas_marca FOR SELECT
  USING (
    marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
  );

CREATE POLICY "metricas_insert_service"
  ON public.metricas_marca FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "metricas_update_service"
  ON public.metricas_marca FOR UPDATE
  USING (auth.role() = 'service_role');


-- ─── SEGUIMIENTOS ────────────────────────────────────────────
DROP POLICY IF EXISTS "seguimientos_select_public" ON public.seguimientos;
DROP POLICY IF EXISTS "seguimientos_insert_own"    ON public.seguimientos;
DROP POLICY IF EXISTS "seguimientos_delete_own"    ON public.seguimientos;

CREATE POLICY "seguimientos_select_public"
  ON public.seguimientos FOR SELECT USING (TRUE);

CREATE POLICY "seguimientos_insert_own"
  ON public.seguimientos FOR INSERT
  WITH CHECK (
    seguidor_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );

CREATE POLICY "seguimientos_delete_own"
  ON public.seguimientos FOR DELETE
  USING (
    seguidor_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );

-- ─── NOTIFICACIONES ──────────────────────────────────────────
-- Sin policy de INSERT: solo las crean los triggers SECURITY DEFINER
-- de la sección siguiente, nunca un insert directo desde la app.
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificaciones_select_own" ON public.notificaciones;
DROP POLICY IF EXISTS "notificaciones_update_own" ON public.notificaciones;

CREATE POLICY "notificaciones_select_own"
  ON public.notificaciones FOR SELECT
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    OR marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
  );

-- FOR UPDATE (marcar como leída) — el propio destinatario puede
-- actualizar sus filas; el trigger no necesita esta policy porque
-- corre como SECURITY DEFINER.
CREATE POLICY "notificaciones_update_own"
  ON public.notificaciones FOR UPDATE
  USING (
    usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    OR marca_id = (SELECT id FROM public.marcas WHERE auth_id = auth.uid())
  );


-- ============================================================
-- TRIGGERS DE NOTIFICACIONES
-- Cada función es SECURITY DEFINER a propósito: quien dispara el
-- INSERT original (el que da like/repostea/etiqueta/reseña) casi
-- nunca es el destinatario de la notificación, así que sin
-- SECURITY DEFINER el propio RLS de "notificaciones" (sin policy de
-- INSERT para clientes) bloquearía el insert que hace el trigger.
-- Ejecutando como definer, el trigger puede escribir la notificación
-- del destinatario sin necesidad de abrir INSERT a nadie más.
-- ============================================================

-- LIKE ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notificar_like()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_destino_usuario UUID;
  v_destino_marca   UUID;
BEGIN
  SELECT usuario_id, marca_id INTO v_destino_usuario, v_destino_marca
  FROM public.publicaciones WHERE id = NEW.publicacion_id;

  -- No notificar like a la propia publicación (ya bloqueado en el
  -- cliente, pero se refuerza acá por si algún día cambia esa regla).
  IF (v_destino_usuario IS NOT NULL AND v_destino_usuario = NEW.usuario_id)
     OR (v_destino_marca IS NOT NULL AND v_destino_marca = NEW.marca_id) THEN
    RETURN NEW;
  END IF;

  IF v_destino_usuario IS NULL AND v_destino_marca IS NULL THEN
    RETURN NEW; -- publicación ya no existe o quedó sin autor
  END IF;

  INSERT INTO public.notificaciones (usuario_id, marca_id, tipo, actor_usuario_id, actor_marca_id, publicacion_id)
  VALUES (v_destino_usuario, v_destino_marca, 'like', NEW.usuario_id, NEW.marca_id, NEW.publicacion_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_like ON public.likes;
CREATE TRIGGER trg_notificar_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.fn_notificar_like();

-- REPOST ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notificar_repost()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_destino_usuario UUID;
  v_destino_marca   UUID;
BEGIN
  SELECT usuario_id, marca_id INTO v_destino_usuario, v_destino_marca
  FROM public.publicaciones WHERE id = NEW.publicacion_id;

  IF (v_destino_usuario IS NOT NULL AND v_destino_usuario = NEW.usuario_id)
     OR (v_destino_marca IS NOT NULL AND v_destino_marca = NEW.marca_id) THEN
    RETURN NEW;
  END IF;

  IF v_destino_usuario IS NULL AND v_destino_marca IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notificaciones (usuario_id, marca_id, tipo, actor_usuario_id, actor_marca_id, publicacion_id)
  VALUES (v_destino_usuario, v_destino_marca, 'repost', NEW.usuario_id, NEW.marca_id, NEW.publicacion_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_repost ON public.reposts;
CREATE TRIGGER trg_notificar_repost
  AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.fn_notificar_repost();

-- ETIQUETA (solo si enlaza a una prenda real de catálogo, no a texto
-- libre) ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notificar_etiqueta()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_marca_destino UUID;
  v_actor_usuario UUID;
  v_actor_marca   UUID;
BEGIN
  IF NEW.prenda_id IS NULL THEN
    RETURN NEW; -- etiqueta manual (texto libre): no hay marca real que notificar
  END IF;

  SELECT marca_id INTO v_marca_destino FROM public.prendas WHERE id = NEW.prenda_id;
  IF v_marca_destino IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT usuario_id, marca_id INTO v_actor_usuario, v_actor_marca
  FROM public.publicaciones WHERE id = NEW.publicacion_id;

  -- No notificar si la propia marca se etiquetó a sí misma en su
  -- propia publicación.
  IF v_actor_marca IS NOT NULL AND v_actor_marca = v_marca_destino THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notificaciones (marca_id, tipo, actor_usuario_id, actor_marca_id, publicacion_id, prenda_id)
  VALUES (v_marca_destino, 'etiqueta', v_actor_usuario, v_actor_marca, NEW.publicacion_id, NEW.prenda_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_etiqueta ON public.etiquetas;
CREATE TRIGGER trg_notificar_etiqueta
  AFTER INSERT ON public.etiquetas
  FOR EACH ROW EXECUTE FUNCTION public.fn_notificar_etiqueta();

-- RESEÑA (siempre de un usuario sobre una prenda; se dispara solo en
-- reseñas nuevas — guardarReseña() hace upsert, y una fila ON
-- CONFLICT DO UPDATE no dispara un trigger AFTER INSERT, así que
-- editar una reseña existente no genera una notificación nueva)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notificar_reseña()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_marca_destino UUID;
BEGIN
  SELECT marca_id INTO v_marca_destino FROM public.prendas WHERE id = NEW.prenda_id;
  IF v_marca_destino IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notificaciones (marca_id, tipo, actor_usuario_id, prenda_id)
  VALUES (v_marca_destino, 'reseña', NEW.usuario_id, NEW.prenda_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_reseña ON public.reseñas;
CREATE TRIGGER trg_notificar_reseña
  AFTER INSERT ON public.reseñas
  FOR EACH ROW EXECUTE FUNCTION public.fn_notificar_reseña();

-- Realtime: mismo criterio idempotente que supabase_realtime_likes.sql
-- (histórico, ver nota de la sección de Storage) — "ALTER PUBLICATION
-- ... ADD TABLE" lanza error si se corre dos veces sobre la misma
-- tabla, así que se envuelve en un chequeo previo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notificaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
  END IF;
END $$;


-- ============================================================
-- STORAGE: BUCKETS Y POLICIES
-- Nota: los buckets "avatars", "publicaciones" y "prendas" ya existen
-- en el proyecto de Supabase, pero el script que los creó se perdió en
-- una consolidación anterior de este archivo (no queda rastro de
-- "storage.buckets" más arriba). De acá en adelante, todo bucket o
-- policy de Storage nuevo se registra en esta sección.
-- ============================================================

-- ─── LOGOS DE MARCA ─────────────────────────────────────────
-- Mismo criterio que el bucket "prendas": público para lectura, y solo
-- la propia marca puede subir/editar/borrar dentro de su propia
-- carpeta ({marca_id}/...). Archivo único reemplazable (logo.jpg,
-- upsert:true), igual que el bucket "avatars", no una galería
-- acumulable como "prendas"/"publicaciones".
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "logos_storage_select_public" ON storage.objects;
CREATE POLICY "logos_storage_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_storage_insert_own_marca" ON storage.objects;
CREATE POLICY "logos_storage_insert_own_marca"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.marcas WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "logos_storage_update_own_marca" ON storage.objects;
CREATE POLICY "logos_storage_update_own_marca"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.marcas WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "logos_storage_delete_own_marca" ON storage.objects;
CREATE POLICY "logos_storage_delete_own_marca"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM public.marcas WHERE auth_id = auth.uid()
    )
  );

-- ============================================================
-- Script ejecutado correctamente
-- ============================================================
-- Tablas (12):
--   usuarios, preferencias_usuario, marcas, prendas,
--   publicaciones, etiquetas, likes, reposts, comentarios,
--   reseñas, metricas_marca, seguimientos
--
-- Triggers updated_at (6):
--   usuarios, marcas, prendas, preferencias_usuario,
--   comentarios, reseñas
--
-- Índices (31):
--   Búsqueda gin_trgm: marcas.nombre, prendas.nombre,
--   publicaciones.descripcion
--   Joins frecuentes: todos los FK + created_at DESC
--   seguimientos: seguidor_id, seguido_id
--
-- RLS (12 tablas, 38 políticas):
--   Todos con DROP IF EXISTS antes del CREATE
--   para poder re-ejecutar el script sin errores
-- ============================================================
