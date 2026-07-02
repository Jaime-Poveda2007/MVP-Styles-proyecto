import { supabase } from '../../lib/supabase';

export interface Etiqueta {
  id: string;
  publicacion_id: string;
  pos_x: number;
  pos_y: number;
  es_manual: boolean;
  prenda_id: string | null;
  nombre_manual: string | null;
  marca_manual: string | null;
  precio_manual: number | null;
  estilo_id: string | null;
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

export async function crearEtiquetaCatalogo(params: {
  publicacionId: string;
  posX: number;
  posY: number;
  prendaId: string;
  estiloId?: string | null;
}) {
  const { data, error } = await supabase
    .from('etiquetas')
    .insert({
      publicacion_id: params.publicacionId,
      pos_x: params.posX,
      pos_y: params.posY,
      es_manual: false,
      prenda_id: params.prendaId,
      estilo_id: params.estiloId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Etiqueta;
}

export async function crearEtiquetaManual(params: {
  publicacionId: string;
  posX: number;
  posY: number;
  nombreManual: string;
  marcaManual?: string;
  precioManual?: number;
  estiloId?: string | null;
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
      estilo_id: params.estiloId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Etiqueta;
}

export async function listarEtiquetas(publicacionId: string) {
  const { data, error } = await supabase
    .from('etiquetas')
    .select('*')
    .eq('publicacion_id', publicacionId);

  if (error) throw error;
  return data as Etiqueta[];
}

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

export async function eliminarEtiqueta(etiquetaId: string) {
  const { error } = await supabase.from('etiquetas').delete().eq('id', etiquetaId);
  if (error) throw error;
}

export async function buscarPrendas(termino: string) {
  if (termino.trim().length < 2) return [];

  const { data, error } = await supabase.rpc('buscar_prendas', {
    termino: termino.trim(),
  });

  if (error) throw error;
  return data as PrendaCatalogo[];
}

export async function obtenerDetallePrenda(prendaId: string) {
  const { data, error } = await supabase
    .from('prendas')
    .select(`
      id,
      nombre,
      precio,
      url_tienda,
      activa,
      marcas ( nombre ),
      resenas ( valoracion )
    `)
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
