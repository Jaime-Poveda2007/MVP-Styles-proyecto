// src/features/marcas/catalogo/services/prendasService.ts
//
// RF-M02 / RF-M03: catálogo de prendas de una marca.
//
// Requiere el bucket de Storage "prendas" (público, mismo criterio que
// el bucket "publicaciones" del feed). Ver database/marcas_setup.sql
// para crearlo junto con la política RLS que permite a cada marca ver
// su propio catálogo completo (incluidas las prendas desactivadas).

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../../../lib/supabase';
import { Prenda, CategoriaPrenda } from '../types';

export const LIMITE_PRENDAS_ACTIVAS = 200;

// ── Selección / compresión de imagen (mismo criterio que publicacionesService) ──
export async function seleccionarImagenDeGaleria(): Promise<string | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) throw new Error('Necesitamos permiso para acceder a tu galería.');
  const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
  if (resultado.canceled) return null;
  return resultado.assets[0].uri;
}

export async function tomarFotoPrenda(): Promise<string | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) throw new Error('Necesitamos permiso para usar la cámara.');
  const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
  if (resultado.canceled) return null;
  return resultado.assets[0].uri;
}

export async function comprimirImagenPrenda(uri: string): Promise<string> {
  const resultado = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return resultado.uri;
}

export async function subirImagenPrenda(uri: string, marcaId: string): Promise<string> {
  const respuesta = await fetch(uri);
  const arrayBuffer = await respuesta.arrayBuffer();
  const nombreArchivo = `${marcaId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('prendas')
    .upload(nombreArchivo, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('prendas').getPublicUrl(nombreArchivo);
  return data.publicUrl;
}

// ── Identidad de la marca autenticada ────────────────────────────────
export async function obtenerMarcaId(): Promise<string> {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) throw new Error('No hay sesión activa.');
  const { data, error } = await supabase
    .from('marcas')
    .select('id')
    .eq('auth_id', userData.user.id)
    .single();
  if (error || !data) throw new Error('No se encontró el perfil de la marca.');
  return data.id;
}

// ── Validaciones (RF-M02/M03) ────────────────────────────────────────
export function validarUrlTienda(url: string): string | undefined {
  if (!url.trim()) return 'Ingresa la URL de la tienda';
  if (!/^https?:\/\//.test(url.trim())) return 'La URL debe empezar con http:// o https://';
  return undefined;
}

export function validarPrecio(precio: string): string | undefined {
  const n = Number(precio.replace(',', '.'));
  if (!precio.trim() || Number.isNaN(n)) return 'Ingresa un precio válido';
  if (n < 0) return 'El precio no puede ser negativo';
  return undefined;
}

// ── Consultas ─────────────────────────────────────────────────────────
export async function contarPrendasActivas(marcaId: string): Promise<number> {
  const { count, error } = await supabase
    .from('prendas')
    .select('id', { count: 'exact', head: true })
    .eq('marca_id', marcaId)
    .eq('activa', true);
  if (error) throw error;
  return count ?? 0;
}

// Lista TODO el catálogo de la marca (activas e inactivas) para el panel.
// Requiere la política RLS "prendas_select_own_marca" (ver marcas_setup.sql):
// la política pública "prendas_select_activas" solo muestra activa = TRUE,
// así que sin esa política adicional la marca no vería sus propias
// prendas desactivadas.
export async function listarPrendasDeLaMarca(marcaId: string): Promise<Prenda[]> {
  const { data, error } = await supabase
    .from('prendas')
    .select('*')
    .eq('marca_id', marcaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Prenda[];
}

// ── Mutaciones ────────────────────────────────────────────────────────
export interface DatosPrenda {
  nombre: string;
  precio: number;
  descripcion?: string;
  categoria: CategoriaPrenda;
  urlTienda: string;
  imagenUrl?: string;
}

export async function crearPrenda(marcaId: string, datos: DatosPrenda): Promise<Prenda> {
  // RF-M02: límite de 200 prendas activas por marca.
  const activas = await contarPrendasActivas(marcaId);
  if (activas >= LIMITE_PRENDAS_ACTIVAS) {
    throw new Error(`Ya alcanzaste el límite de ${LIMITE_PRENDAS_ACTIVAS} prendas activas.`);
  }

  const { data, error } = await supabase
    .from('prendas')
    .insert({
      marca_id: marcaId,
      nombre: datos.nombre.trim(),
      precio: datos.precio,
      descripcion: datos.descripcion?.trim() || null,
      categoria: datos.categoria,
      imagen_url: datos.imagenUrl ?? null,
      url_tienda: datos.urlTienda.trim(),
      activa: true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Prenda;
}

export async function actualizarPrenda(prendaId: string, datos: Partial<DatosPrenda>): Promise<Prenda> {
  const cambios: Record<string, unknown> = {};
  if (datos.nombre !== undefined) cambios.nombre = datos.nombre.trim();
  if (datos.precio !== undefined) cambios.precio = datos.precio;
  if (datos.descripcion !== undefined) cambios.descripcion = datos.descripcion.trim() || null;
  if (datos.categoria !== undefined) cambios.categoria = datos.categoria;
  if (datos.urlTienda !== undefined) cambios.url_tienda = datos.urlTienda.trim();
  if (datos.imagenUrl !== undefined) cambios.imagen_url = datos.imagenUrl;

  const { data, error } = await supabase
    .from('prendas')
    .update(cambios)
    .eq('id', prendaId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Prenda;
}

// RF-M03: "Desactivación de prendas (ocultar de búsqueda sin borrar
// etiquetas)". Se actualiza activa=false en vez de borrar la fila: la
// política RLS "prendas_select_activas" ya la oculta de cualquier
// búsqueda/etiquetado nuevo, y las etiquetas ya creadas (public.etiquetas)
// mantienen su prenda_id intacto porque nunca se llega a un DELETE.
export async function desactivarPrenda(prendaId: string): Promise<void> {
  const { error } = await supabase.from('prendas').update({ activa: false }).eq('id', prendaId);
  if (error) throw error;
}

export async function reactivarPrenda(prendaId: string, marcaId: string): Promise<void> {
  const activas = await contarPrendasActivas(marcaId);
  if (activas >= LIMITE_PRENDAS_ACTIVAS) {
    throw new Error(`No puedes reactivar: ya tienes ${LIMITE_PRENDAS_ACTIVAS} prendas activas.`);
  }
  const { error } = await supabase.from('prendas').update({ activa: true }).eq('id', prendaId);
  if (error) throw error;
}
