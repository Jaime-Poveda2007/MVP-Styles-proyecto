import { supabase } from '../../lib/supabase';

// =========================================================
// Tipos (ajustados al esquema REAL de la tabla "etiquetas":
// id, publicacion_id, prenda_id, pos_x, pos_y, nombre_manual,
// marca_manual, precio_manual, es_manual, created_at)
// =========================================================

export interface Etiqueta {
  id: string;
  publicacion_id: string;
  pos_x: number; // 0 a 1
  pos_y: number; // 0 a 1
  es_manual: boolean;
  prenda_id: string | null;
  nombre_manual: string | null;
  marca_manual: string | null;
  precio_manual: number | null;
  created_at: string;
}

export interface PrendaCatalogo {
  id: string;
  nombre: string;
  marca_id: string;
  marca_nombre: string;
  precio: number;
  imagen_url: string;
}

// =========================================================
// Crear etiqueta de catálogo
// =========================================================
export async function crearEtiquetaCatalogo(params: {
  publicacionId: string;
  posX: number;
  posY: number;
  prendaId: string;
}) {
  const { data, error } = await supabase
    .from('etiquetas')
    .insert({
      publicacion_id: params.publicacionId,
      pos_x: params.posX,
      pos_y: params.posY,
      es_manual: false,
      prenda_id: params.prendaId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Etiqueta;
}

// =========================================================
// Crear etiqueta manual (prenda no registrada en catálogo)
// =========================================================
export async function crearEtiquetaManual(params: {
  publicacionId: string;
  posX: number;
  posY: number;
  nombreManual: string;
  marcaManual?: string;
  precioManual?: number;
}) {
  const { data, error } = await supabase
    .from('etiquetas')
    .insert({
      publicacion_id: params.publicacionId,
      pos_x: params.posX,
      pos_y: params.posY,
      es_manual: true,
      nombre_manual: params.nombreManual,
      marca_manual: params.marcaManual ?? null,
      precio_manual: params.precioManual ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Etiqueta;
}

// =========================================================
// Listar etiquetas de una publicación
// =========================================================
export async function listarEtiquetas(publicacionId: string) {
  const { data, error } = await supabase
    .from('etiquetas')
    .select('*')
    .eq('publicacion_id', publicacionId);

  if (error) throw error;
  return data as Etiqueta[];
}

// =========================================================
// Reposicionar etiqueta
// =========================================================
export async function reposicionarEtiqueta(params: {
  etiquetaId: string;
  posX: number;
  posY: number;
}) {
  const { data, error } = await supabase
    .from('etiquetas')
    .update({ pos_x: params.posX, pos_y: params.posY })
    .eq('id', params.etiquetaId)
    .select()
    .single();

  if (error) throw error;
  return data as Etiqueta;
}

// =========================================================
// Eliminar etiqueta
// =========================================================
export async function eliminarEtiqueta(etiquetaId: string) {
  const { error } = await supabase.from('etiquetas').delete().eq('id', etiquetaId);
  if (error) throw error;
}

// =========================================================
// Buscar prendas del catálogo (por nombre o marca)
// Llama a la función SQL "buscar_prendas"
// =========================================================
export async function buscarPrendas(termino: string) {
  if (termino.trim().length < 2) return [];

  const { data, error } = await supabase.rpc('buscar_prendas', {
    termino: termino.trim(),
  });

  if (error) throw error;
  return data as PrendaCatalogo[];
}

// =========================================================
// Detalle de una prenda (para la tarjeta al tocar etiqueta)
// incluye valoración promedio (de RF-C02, mes 4)
// Para etiquetas manuales, el detalle viene directo de la
// etiqueta (nombre_manual / marca_manual / precio_manual),
// no de esta función.
// =========================================================
export async function obtenerDetallePrenda(prendaId: string) {
  const { data, error } = await supabase
    .from('prendas')
    .select(
      `
      id,
      nombre,
      precio,
      url_tienda,
      activa,
      marcas ( nombre ),
      resenas ( valoracion )
    `
    )
    .eq('id', prendaId)
    .single();

  if (error) throw error;

  const valoraciones = (data.resenas ?? []) as { valoracion: number }[];
  const promedio =
    valoraciones.length > 0
      ? valoraciones.reduce((acc, r) => acc + r.valoracion, 0) / valoraciones.length
      : null;

  return {
    id: data.id,
    nombre: data.nombre,
    marca: (data.marcas as any)?.nombre ?? '',
    precio: data.precio,
    urlTienda: data.url_tienda,
    activa: data.activa,
    valoracionPromedio: promedio,
  };
}
