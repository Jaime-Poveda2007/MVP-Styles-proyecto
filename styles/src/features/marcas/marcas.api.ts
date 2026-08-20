// src/features/marcas/marcas.api.ts
//
// RF-M01 — Registro y autenticación de marcas.

import { supabase } from '../../lib/supabase';
import { Publicacion } from '../feed/types';
import type { RepostConOriginal } from '../perfil/reposts.api';

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

// ── Perfil público de marca ──────────────────────────────────────────
export interface PerfilMarcaPublico {
  id: string;
  nombre: string;
  logo_url: string | null;
  categoria: string;
  descripcion: string | null;
}

// Nunca se exponen campos privados (email, nit/rut, estado, país,
// ciudad) — mismo criterio que obtenerPerfilPublico() de usuario en
// perfil.api.ts. descripcion sí es pública (misma naturaleza que la
// biografía de usuario), así que tanto el perfil público como el
// propio pueden reusar esta misma función para el header.
export async function obtenerPerfilPublicoDeMarca(marcaId: string): Promise<PerfilMarcaPublico> {
  const { data, error } = await supabase
    .from('marcas')
    .select('id, nombre, logo_url, categoria, descripcion')
    .eq('id', marcaId)
    .single();
  if (error) throw error;
  return data as PerfilMarcaPublico;
}

// ── Edición de perfil de marca ───────────────────────────────────────
export interface MarcaEditable {
  id: string;
  nombre: string;
  pais: string;
  ciudad: string;
  categoria: CategoriaMarca;
  descripcion: string | null;
  logo_url: string | null;
}

// A diferencia de obtenerPerfilPublicoDeMarca, sí incluye país/ciudad
// — solo para precargar el propio formulario de edición, nunca se
// expone a terceros.
export async function obtenerMarcaEditable(marcaId: string): Promise<MarcaEditable> {
  const { data, error } = await supabase
    .from('marcas')
    .select('id, nombre, pais, ciudad, categoria, descripcion, logo_url')
    .eq('id', marcaId)
    .single();
  if (error) throw error;
  return data as MarcaEditable;
}

export interface DatosMarcaEditable {
  nombre: string;
  pais: string;
  ciudad: string;
  categoria: CategoriaMarca;
  descripcion: string;
  logoUrl?: string;
}

// Una sola escritura atómica, mismo criterio que actualizarPerfil() de
// usuario (perfil.api.ts): evita guardado parcial si algo falla a
// mitad de camino. Ningún campo editable de marca es UNIQUE, así que
// no hace falta manejo especial de 23505.
export async function actualizarMarca(marcaId: string, datos: DatosMarcaEditable): Promise<void> {
  const cambios: Record<string, unknown> = {
    nombre: datos.nombre.trim(),
    pais: datos.pais.trim(),
    ciudad: datos.ciudad.trim(),
    categoria: datos.categoria,
    descripcion: datos.descripcion.trim() || null,
  };
  if (datos.logoUrl) cambios.logo_url = datos.logoUrl;

  const { error } = await supabase.from('marcas').update(cambios).eq('id', marcaId);
  if (error) throw error;
}

// Duplicada a propósito en vez de importar validarBiografia de
// perfil.api.ts — mismo criterio de no-acoplamiento ya usado en este
// archivo para SELECT_PUBLICACION.
export function validarDescripcionMarca(input: string): string | undefined {
  if (input.length > 150) return 'Máximo 150 caracteres';
  return undefined;
}

// Bucket "logos": archivo único reemplazable por marca (mismo criterio
// que subirFotoDePerfil en perfil.api.ts), no una galería acumulable
// como el bucket "prendas". Las funciones de selección/cámara/
// compresión de imagen son genéricas y se reusan tal cual desde
// perfil.api.ts (seleccionarFotoDePerfil, tomarFotoDePerfil,
// comprimirFotoDePerfil) — no se duplican acá.
export async function subirLogoDeMarca(uri: string, marcaId: string): Promise<string> {
  const respuesta = await fetch(uri);
  const arrayBuffer = await respuesta.arrayBuffer();
  const nombreArchivo = `${marcaId}/logo.jpg`;
  const { error } = await supabase.storage
    .from('logos')
    .upload(nombreArchivo, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('logos').getPublicUrl(nombreArchivo);
  // Cache-bust: la URL pública es siempre la misma ruta, así que sin un
  // parámetro que cambie, <Image> podría seguir mostrando la versión
  // cacheada anterior tras reemplazar el archivo.
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ── Publicaciones de la marca (cuadrícula del perfil público) ────────
// Clon de listarPublicacionesDeUsuario (perfil.api.ts) filtrando por
// marca_id en vez de usuario_id — misma forma de SELECT y enriquecido
// de likes/reposts, duplicado deliberadamente (ver plan) en vez de
// extraer un helper compartido.
const PAGE_SIZE = 10;
const SELECT_PUBLICACION = `
  id, imagen_url, descripcion, es_de_marca, created_at,
  usuario_id, marca_id,
  usuario:usuarios!publicaciones_usuario_id_fkey ( id, nombre, username, foto_url ),
  marca:marcas!publicaciones_marca_id_fkey ( id, nombre, logo_url ),
  etiquetas (
    id, pos_x, pos_y, es_manual,
    nombre_texto, marca_texto, precio_manual,
    prenda:prendas ( id, nombre, precio, imagen_url, url_tienda, activa, marca:marcas ( nombre ) ),
    estilo:estilos ( nombre )
  )
`;

export async function listarPublicacionesDeMarca(
  marcaId: string,
  offset = 0
): Promise<Publicacion[]> {
  const { data, error } = await supabase
    .from('publicaciones')
    .select(SELECT_PUBLICACION)
    .eq('marca_id', marcaId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  const posts = data ?? [];
  const ids = posts.map((p: any) => p.id);

  const [{ data: likes }, { data: reposts }] = ids.length
    ? await Promise.all([
        supabase.from('likes').select('publicacion_id').eq('marca_id', marcaId).in('publicacion_id', ids),
        supabase.from('reposts').select('publicacion_id').eq('marca_id', marcaId).in('publicacion_id', ids),
      ])
    : [{ data: [] }, { data: [] }];
  const setLikes = new Set((likes ?? []).map((l: any) => l.publicacion_id));
  const setReposts = new Set((reposts ?? []).map((r: any) => r.publicacion_id));

  return Promise.all(
    posts.map(async (p: any) => {
      const [{ count: likesCount }, { count: repostsCount }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('publicacion_id', p.id),
        supabase.from('reposts').select('*', { count: 'exact', head: true }).eq('publicacion_id', p.id),
      ]);
      return {
        ...p,
        usuario: Array.isArray(p.usuario) ? p.usuario[0] ?? null : p.usuario ?? null,
        marca: Array.isArray(p.marca) ? p.marca[0] ?? null : p.marca ?? null,
        likes_count: likesCount ?? 0,
        reposts_count: repostsCount ?? 0,
        yo_di_like: setLikes.has(p.id),
        yo_reposteo: setReposts.has(p.id),
        etiquetas: p.etiquetas ?? [],
      } as Publicacion;
    })
  );
}

// ── Reposts de la marca (pestaña pública "Reposts") ──────────────────
// Clon de listarMisReposts (perfil/reposts.api.ts) filtrando marca_id
// en vez de usuario_id — mismo criterio de duplicación deliberada que
// listarPublicacionesDeMarca. eliminarRepost() se reusa tal cual desde
// perfil/reposts.api.ts (ya es agnóstica al actor).
export async function listarRepostsDeMarca(marcaId: string): Promise<RepostConOriginal[]> {
  const { data: reposts, error } = await supabase
    .from('reposts')
    .select('id, created_at, publicacion_id')
    .eq('marca_id', marcaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!reposts || reposts.length === 0) return [];

  const ids = reposts.map(r => r.publicacion_id);
  const { data: publicaciones, error: errPub } = await supabase
    .from('publicaciones')
    .select(SELECT_PUBLICACION)
    .in('id', ids);
  if (errPub) throw errPub;

  const [{ data: misLikes }, { data: misReposts }] = await Promise.all([
    supabase.from('likes').select('publicacion_id').eq('marca_id', marcaId).in('publicacion_id', ids),
    supabase.from('reposts').select('publicacion_id').eq('marca_id', marcaId).in('publicacion_id', ids),
  ]);
  const setLikes = new Set((misLikes ?? []).map((l: any) => l.publicacion_id));
  const setReposts = new Set((misReposts ?? []).map((r: any) => r.publicacion_id));

  const mapaPub = new Map(
    (publicaciones ?? []).map((p: any) => [
      p.id,
      {
        ...p,
        usuario: Array.isArray(p.usuario) ? p.usuario[0] ?? null : p.usuario ?? null,
        marca: Array.isArray(p.marca) ? p.marca[0] ?? null : p.marca ?? null,
        likes_count: 0,
        reposts_count: 0,
        yo_di_like: setLikes.has(p.id),
        yo_reposteo: setReposts.has(p.id),
        etiquetas: p.etiquetas ?? [],
      } as Publicacion,
    ])
  );

  await Promise.all(
    ids.map(async (id) => {
      const pub = mapaPub.get(id);
      if (!pub) return;
      const [{ count: likesCount }, { count: repostsCount }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('publicacion_id', id),
        supabase.from('reposts').select('*', { count: 'exact', head: true }).eq('publicacion_id', id),
      ]);
      pub.likes_count = likesCount ?? 0;
      pub.reposts_count = repostsCount ?? 0;
    })
  );

  return reposts
    .filter(r => mapaPub.has(r.publicacion_id))
    .map(r => ({
      repostId: r.id,
      repostedAt: r.created_at,
      publicacion: mapaPub.get(r.publicacion_id)!,
    }));
}
