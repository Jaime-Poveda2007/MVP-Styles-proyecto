// src/lib/marcaPerfil.ts
//
// Análogo a perfil.ts pero para el actor "Marca" (RF-M01).
//
// Igual que con usuarios, la fila en public.marcas no se crea en el
// signUp si el proyecto de Supabase tiene confirmación de email
// obligatoria (no hay sesión todavía). En ese caso se crea en el
// primer login exitoso, leyendo los datos del registro desde
// session.user.user_metadata (donde marcas.api.ts los guardó al
// llamar a supabase.auth.signUp).
//
// IMPORTANTE: usuarios y marcas comparten la misma tabla auth.users
// de Supabase. Para saber si una sesión pertenece a una marca (y no
// crearle por error una fila en public.usuarios), toda cuenta de
// marca se registra con user_metadata.tipo_cuenta = 'marca'. App.tsx
// debe revisar ese campo ANTES de decidir si llama a
// asegurarPerfilUsuario o a asegurarPerfilMarca.

import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type EstadoMarca = 'pendiente' | 'aprobada' | 'rechazada';

export interface PerfilMarcaResultado {
  id: string;
  nombre: string;
  estado: EstadoMarca;
}

/** True si la sesión pertenece a una cuenta de marca (RF-M01). */
export function esCuentaDeMarca(session: Session): boolean {
  return (session.user.user_metadata as any)?.tipo_cuenta === 'marca';
}

async function buscarMarcaExistente(authId: string): Promise<PerfilMarcaResultado | null> {
  const { data } = await supabase
    .from('marcas')
    .select('id, nombre, estado')
    .eq('auth_id', authId)
    .maybeSingle();
  return data as PerfilMarcaResultado | null;
}

async function crearMarca(session: Session): Promise<PerfilMarcaResultado> {
  const authId = session.user.id;
  const email = session.user.email ?? '';
  const meta = (session.user.user_metadata ?? {}) as {
    nombre_marca?: string;
    nit_rut?: string;
    pais?: string;
    ciudad?: string;
    categoria?: string;
  };

  const { data, error } = await supabase
    .from('marcas')
    .insert({
      auth_id: authId,
      nombre: meta.nombre_marca?.trim() || 'Marca sin nombre',
      // NIT/RUT: se omite del registro por decisión de producto para
      // esta etapa del MVP (ver roadmap RF-M01, se retomará más
      // adelante). La columna quedó opcional en la BD para esto.
      nit_rut: meta.nit_rut?.trim() || null,
      email_contacto: email,
      pais: meta.pais?.trim() || '',
      ciudad: meta.ciudad?.trim() || '',
      categoria: meta.categoria || 'Unisex',
      // TEMPORAL: el flujo de "Pendiente de aprobación" (RF-M01) está
      // desactivado en esta etapa por decisión de producto — las
      // marcas quedan aprobadas de inmediato al registrarse. Para
      // reactivar el flujo de aprobación manual más adelante (según
      // el roadmap), basta con volver esto a 'pendiente'; el resto de
      // la infraestructura (PPendienteAprobacion.tsx, el branching en
      // App.tsx, la policy de RLS) ya está lista y no requiere cambios.
      estado: 'aprobada',
    })
    .select('id, nombre, estado')
    .single();

  if (!error && data) return data as PerfilMarcaResultado;

  // 23505 = unique_violation. Puede pasar por doble llamada casi
  // simultánea (dos pestañas) o por auth_id/email ya usados: en ese
  // caso simplemente recuperamos la fila que ya existe.
  if (error?.code === '23505') {
    const existente = await buscarMarcaExistente(authId);
    if (existente) return existente;
  }

  throw error ?? new Error('No se pudo crear el registro de la marca.');
}

/**
 * Devuelve el perfil de marcas correspondiente a la sesión activa.
 * Si todavía no existe (primer login tras confirmar el correo), lo crea
 * con estado 'pendiente'.
 */
export async function asegurarPerfilMarca(session: Session): Promise<PerfilMarcaResultado> {
  const existente = await buscarMarcaExistente(session.user.id);
  if (existente) return existente;
  return crearMarca(session);
}
