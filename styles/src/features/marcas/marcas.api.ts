// src/features/marcas/marcas.api.ts
//
// RF-M01 — Registro y autenticación de marcas.

import { supabase } from '../../lib/supabase';

export const CATEGORIAS_MARCA = ['Mujer', 'Hombre', 'Unisex', 'Infantil'] as const;
export type CategoriaMarca = (typeof CATEGORIAS_MARCA)[number];

export interface RegistroMarcaInput {
  nombre: string;
  email: string;
  password: string;
  pais: string;
  ciudad: string;
  categoria: CategoriaMarca;
}

export interface RegistroMarcaResultado {
  /** true si Supabase requiere confirmar el correo antes de poder iniciar sesión. */
  requiereConfirmacion: boolean;
}

/**
 * Registra una nueva marca (RF-M01).
 *
 * Reutiliza supabase.auth.signUp (mismo mecanismo que usuarios) en vez de
 * un backend propio, así que:
 *  - La contraseña queda sujeta a las mismas reglas de seguridad que un
 *    usuario (se validan en la UI con validarPasswordMarca, ver
 *    PRegistroMarca.tsx).
 *  - El "correo de notificación al representante" (checklist RF-M01) es
 *    el correo de confirmación que Supabase Auth envía automáticamente al
 *    hacer signUp — no hay servicio de email propio en este proyecto
 *    (decisión técnica: costo $0, sin backend). Si más adelante se quiere
 *    un correo con texto propio ("tu marca fue registrada y está en
 *    revisión"), se necesitaría una Supabase Edge Function con un
 *    proveedor de email (ej. Resend), lo cual queda fuera del alcance
 *    actual del MVP.
 *  - La fila real en public.marcas se crea desde marcaPerfil.ts ->
 *    asegurarPerfilMarca, llamada desde App.tsx en cuanto detecta una
 *    sesión con user_metadata.tipo_cuenta === 'marca'. Así el flujo
 *    funciona igual si la confirmación de email está activada (sesión
 *    llega después) o desactivada (sesión inmediata).
 *  - TEMPORAL (decisión de producto para esta etapa del MVP, ver
 *    roadmap): no se pide NIT/RUT y la marca queda aprobada de
 *    inmediato en vez de "pendiente de aprobación". Ver comentarios en
 *    marcaPerfil.ts para reactivar esto más adelante.
 */
export async function registrarMarca(input: RegistroMarcaInput): Promise<RegistroMarcaResultado> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        tipo_cuenta: 'marca',
        nombre_marca: input.nombre.trim(),
        pais: input.pais.trim(),
        ciudad: input.ciudad.trim(),
        categoria: input.categoria,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      throw new Error('Este correo ya está registrado.');
    }
    throw error;
  }
  if (!data.user) throw new Error('No se pudo crear la cuenta de la marca.');

  return { requiereConfirmacion: !data.session };
}
