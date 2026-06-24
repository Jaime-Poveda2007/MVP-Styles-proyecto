// src/lib/perfil.ts
//
// Soluciona el desalineamiento entre auth.users y public.usuarios:
// - styles_database.sql define usuarios.id como UUID autogenerado y
//   usuarios.auth_id como la referencia a auth.users.id.
// - Pero registro/login/onboarding asumían (sin crear nunca la fila)
//   que "el id del usuario" era directamente el id de auth.
//
// Para no reescribir todo el feed (FeedCard, PDetalle, useFeed... ya
// reciben y usan "userId" como si fuera usuarios.id), la fila de perfil
// se crea con id = auth_id = session.user.id de forma explícita.
// Así ambas columnas quedan sincronizadas y el resto de la app sigue
// funcionando sin más cambios.
//
// Esta función es el ÚNICO lugar donde se debe crear/leer el perfil
// inicial. Se llama desde App.tsx (al detectar sesión) y desde
// PLogin.tsx / PRegistro.tsx (justo después de autenticar).

import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface PerfilResultado {
  id: string;
  onboardingCompleto: boolean;
}

function sanitizarUsername(base: string): string {
  const limpio = base
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20);
  return limpio.length >= 3 ? limpio : `user${limpio}`;
}

function sufijoAleatorio(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function crearPerfil(session: Session): Promise<PerfilResultado> {
  const authId = session.user.id;
  const email = session.user.email ?? '';
  const meta = (session.user.user_metadata ?? {}) as { nombre?: string; fecha_nacimiento?: string };
  const nombre = meta.nombre?.trim() || email.split('@')[0] || 'Usuario Styles';
  const fechaNacimiento = meta.fecha_nacimiento ?? null;

  const baseUsername = sanitizarUsername(email.split('@')[0] || nombre);

  // Hasta 5 intentos por si el username ya existe (constraint UNIQUE)
  for (let intento = 0; intento < 5; intento++) {
    const username = intento === 0 ? baseUsername : `${baseUsername}${sufijoAleatorio()}`;
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        id: authId,         // ← alineado a propósito con auth_id (ver comentario arriba)
        auth_id: authId,
        nombre,
        email,
        username,
        fecha_nacimiento: fechaNacimiento,
        email_confirmado: true,
        onboarding_completo: false,
      })
      .select('id, onboarding_completo')
      .single();

    if (!error && data) {
      return { id: data.id, onboardingCompleto: data.onboarding_completo };
    }

    // 23505 = unique_violation. Si es por username, reintenta con sufijo.
    // Si es por email/auth_id (carrera entre dos llamadas casi simultáneas
    // o perfil creado en otra pestaña), volvemos a buscarlo.
    if (error?.code === '23505') {
      const existente = await buscarPerfilExistente(authId);
      if (existente) return existente;
      continue;
    }

    throw error ?? new Error('No se pudo crear el perfil de usuario.');
  }

  throw new Error('No se pudo generar un nombre de usuario disponible.');
}

async function buscarPerfilExistente(authId: string): Promise<PerfilResultado | null> {
  const { data } = await supabase
    .from('usuarios')
    .select('id, onboarding_completo')
    .eq('auth_id', authId)
    .maybeSingle();
  return data ? { id: data.id, onboardingCompleto: data.onboarding_completo } : null;
}

/**
 * Devuelve el perfil de usuarios correspondiente a la sesión activa.
 * Si todavía no existe (primer login tras confirmar el correo), lo crea.
 */
export async function asegurarPerfilUsuario(session: Session): Promise<PerfilResultado> {
  const existente = await buscarPerfilExistente(session.user.id);
  if (existente) return existente;
  return crearPerfil(session);
}
