-- ============================================================
-- Endurecimiento de seguridad: mover el conteo de intentos
-- fallidos de login (5 intentos / bloqueo 15 min) de AsyncStorage
-- (cliente) a Postgres (servidor) — hoy se evade reinstalando la
-- app o borrando datos, porque el contador vive en el dispositivo.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Se puede correr varias veces sin romper nada (mismo criterio que
-- el resto de scripts de esta carpeta).
--
-- Diseño: public.intentos_login tiene RLS habilitado SIN policies,
-- así que ni siquiera con el anon key se puede leer/escribir la
-- tabla directo desde el cliente. Las 3 funciones son
-- SECURITY DEFINER (corren como el dueño, no como quien las llama),
-- así que sí pueden tocar la tabla — son la única puerta de entrada.
-- Eso es lo que hace imposible evadir el bloqueo desde el cliente:
-- el estado ya no vive en el dispositivo, vive acá.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.intentos_login (
  email           TEXT        PRIMARY KEY,
  intentos        INTEGER     NOT NULL DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.intentos_login ENABLE ROW LEVEL SECURITY;
-- Sin CREATE POLICY a propósito: nadie tiene acceso directo.

-- ─── 1. Verificar si un email está bloqueado ─────────────────
-- Si el bloqueo ya expiró, lo limpia (reset a 0 intentos) para no
-- tener que hacerlo aparte desde el cliente.
CREATE OR REPLACE FUNCTION public.verificar_bloqueo_login(p_email TEXT)
RETURNS TABLE (bloqueado BOOLEAN, minutos_restantes INTEGER)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_bloqueado_hasta TIMESTAMPTZ;
BEGIN
  SELECT il.bloqueado_hasta INTO v_bloqueado_hasta
  FROM public.intentos_login il WHERE il.email = v_email;

  IF v_bloqueado_hasta IS NULL OR v_bloqueado_hasta <= NOW() THEN
    IF v_bloqueado_hasta IS NOT NULL THEN
      UPDATE public.intentos_login
        SET intentos = 0, bloqueado_hasta = NULL, actualizado_en = NOW()
        WHERE email = v_email;
    END IF;
    RETURN QUERY SELECT FALSE, 0;
  ELSE
    RETURN QUERY SELECT TRUE, CEIL(EXTRACT(EPOCH FROM (v_bloqueado_hasta - NOW())) / 60)::INTEGER;
  END IF;
END;
$$;

-- ─── 2. Registrar un intento fallido ──────────────────────────
-- Incrementa el contador; si llega a 5, fija el bloqueo de 15 min.
CREATE OR REPLACE FUNCTION public.registrar_intento_fallido_login(p_email TEXT)
RETURNS TABLE (intentos INTEGER, bloqueado BOOLEAN, minutos_restantes INTEGER)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_intentos INTEGER;
BEGIN
  INSERT INTO public.intentos_login (email, intentos, actualizado_en)
    VALUES (v_email, 1, NOW())
    ON CONFLICT (email) DO UPDATE
      SET intentos = public.intentos_login.intentos + 1, actualizado_en = NOW()
    RETURNING public.intentos_login.intentos INTO v_intentos;

  IF v_intentos >= 5 THEN
    UPDATE public.intentos_login
      SET bloqueado_hasta = NOW() + INTERVAL '15 minutes'
      WHERE email = v_email;
    RETURN QUERY SELECT v_intentos, TRUE, 15;
  ELSE
    RETURN QUERY SELECT v_intentos, FALSE, 0;
  END IF;
END;
$$;

-- ─── 3. Registrar un login exitoso ────────────────────────────
-- Resetea el contador (mismo criterio que resetBloqueo() en el
-- cliente hoy).
CREATE OR REPLACE FUNCTION public.registrar_login_exitoso(p_email TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.intentos_login WHERE email = lower(trim(p_email));
END;
$$;

-- Deben poder llamarse ANTES de iniciar sesión (login/registro
-- corren como anon), así que el grant es a anon + authenticated.
GRANT EXECUTE ON FUNCTION public.verificar_bloqueo_login(TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_intento_fallido_login(TEXT)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_login_exitoso(TEXT)          TO anon, authenticated;

-- Refrescar el cache de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación rápida:
-- SELECT * FROM public.verificar_bloqueo_login('nadie@ejemplo.com');
-- (debe devolver bloqueado = false, minutos_restantes = 0)
