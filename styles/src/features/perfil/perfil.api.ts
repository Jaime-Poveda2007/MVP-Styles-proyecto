// src/features/perfil/perfil.api.ts
//
// RF-U10/RF-U11: perfil propio, perfil público de otras personas,
// edición de foto/nombre/username/biografía, y listado paginado de
// publicaciones propias/ajenas para la cuadrícula del perfil.
//
// La subida de foto sigue el mismo patrón de 4 pasos que
// marcas/catalogo/services/prendasService.ts (seleccionar → tomar foto
// → comprimir → subir), pero con una diferencia clave: la foto de
// perfil es un solo asset reemplazable (no una galería como las
// prendas), así que se sube siempre a una ruta FIJA
// `${authUserId}/avatar.jpg` con upsert:true, en vez de un nombre con
// timestamp + upsert:false.

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';
import { Publicacion } from '../feed/types';

const PAGE_SIZE = 10;

export interface PerfilUsuario {
  id: string;
  nombre: string;
  username: string;
  biografia: string | null;
  foto_url: string | null;
}

// ── Lectura de perfil ──────────────────────────────────────────────
export async function obtenerPerfilPropio(userId: string): Promise<PerfilUsuario> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, username, biografia, foto_url')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as PerfilUsuario;
}

// Igual que el propio, pero sin exponer email ni otros datos privados
// (la fila de usuarios completa es legible públicamente por RLS, así
// que la restricción real vive acá: nunca seleccionar/mostrar email).
export async function obtenerPerfilPublico(targetUserId: string): Promise<PerfilUsuario> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, username, biografia, foto_url')
    .eq('id', targetUserId)
    .single();
  if (error) throw error;
  return data as PerfilUsuario;
}

// ── Publicaciones del perfil (cuadrícula) ────────────────────────────
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

export async function listarPublicacionesDeUsuario(
  userId: string,
  offset = 0
): Promise<Publicacion[]> {
  const { data, error } = await supabase
    .from('publicaciones')
    .select(SELECT_PUBLICACION)
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  const posts = data ?? [];
  const ids = posts.map((p: any) => p.id);

  const [{ data: likes }, { data: reposts }] = ids.length
    ? await Promise.all([
        supabase.from('likes').select('publicacion_id').eq('usuario_id', userId).in('publicacion_id', ids),
        supabase.from('reposts').select('publicacion_id').eq('usuario_id', userId).in('publicacion_id', ids),
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

// ── Validaciones ──────────────────────────────────────────────────────
// Distinta de sanitizarUsername() en src/lib/perfil.ts: esa función
// limpia/trunca para AUTOGENERAR un username al crear la cuenta; esta
// valida de forma estricta lo que la persona escribe al editar.
export function validarUsername(input: string): string | undefined {
  const limpio = input.trim();
  if (limpio.length < 3 || limpio.length > 30) return 'Debe tener entre 3 y 30 caracteres';
  if (!/^[a-zA-Z0-9_.]+$/.test(limpio)) return 'Solo letras, números, "_" y "."';
  return undefined;
}

export function validarBiografia(input: string): string | undefined {
  if (input.length > 150) return 'Máximo 150 caracteres';
  return undefined;
}

// ── Mutaciones ────────────────────────────────────────────────────────
export interface DatosPerfil {
  nombre: string;
  username: string;
  biografia: string;
  fotoUrl?: string;
}

// Una sola escritura atómica (en vez de 3 UPDATE en paralelo): si se
// hacían por separado con Promise.all, un username duplicado (23505)
// podía rechazarse mientras nombre/biografía ya habían quedado
// guardados en la fila — un "guardado parcial" confuso para quien
// edita. Con un único UPDATE, o se guarda todo o no se guarda nada.
export async function actualizarPerfil(userId: string, datos: DatosPerfil): Promise<void> {
  const cambios: Record<string, unknown> = {
    nombre: datos.nombre.trim(),
    username: datos.username.trim(),
    biografia: datos.biografia.trim() || null,
  };
  if (datos.fotoUrl) cambios.foto_url = datos.fotoUrl;

  const { error } = await supabase.from('usuarios').update(cambios).eq('id', userId);
  if (error) {
    // 23505 = unique_violation (mismo código que ya maneja src/lib/perfil.ts)
    if (error.code === '23505') throw new Error('Ese nombre de usuario ya está en uso.');
    throw error;
  }
}

// ── Foto de perfil: selección / compresión / subida ──────────────────
export async function seleccionarFotoDePerfil(): Promise<string | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) throw new Error('Necesitamos permiso para acceder a tu galería.');
  const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
  if (resultado.canceled) return null;
  return resultado.assets[0].uri;
}

export async function tomarFotoDePerfil(): Promise<string | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) throw new Error('Necesitamos permiso para usar la cámara.');
  const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
  if (resultado.canceled) return null;
  return resultado.assets[0].uri;
}

export async function comprimirFotoDePerfil(uri: string): Promise<string> {
  const resultado = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return resultado.uri;
}

// Ruta fija (no timestamp) + upsert:true: la foto de perfil reemplaza
// a la anterior en vez de acumularse como las fotos de publicaciones.
export async function subirFotoDePerfil(uri: string, authUserId: string): Promise<string> {
  const respuesta = await fetch(uri);
  const arrayBuffer = await respuesta.arrayBuffer();
  const nombreArchivo = `${authUserId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(nombreArchivo, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(nombreArchivo);
  // Cache-bust: la URL pública es siempre la misma ruta, así que sin un
  // parámetro que cambie, <Image> podría seguir mostrando la versión
  // cacheada anterior tras reemplazar el archivo.
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ── Preferencias de estilo (para precargar en modo edición) ─────────
export interface Preferencias {
  estilos: string[];
  telas: string[];
  colores: string[];
}

export async function obtenerPreferencias(userId: string): Promise<Preferencias> {
  const { data, error } = await supabase
    .from('preferencias_usuario')
    .select('estilos, telas, colores')
    .eq('usuario_id', userId)
    .maybeSingle();
  if (error) throw error;
  return {
    estilos: data?.estilos ?? [],
    telas: data?.telas ?? [],
    colores: data?.colores ?? [],
  };
}
