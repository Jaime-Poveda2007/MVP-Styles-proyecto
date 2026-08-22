import { supabase } from '../../lib/supabase';

export interface Etiqueta {
  id: string;
  publicacion_id: string;
  pos_x: number;
  pos_y: number;
  es_manual: boolean;
  prenda_id: string | null;
  // Antes solo la etiqueta "manual" tenía nombre/marca en texto plano.
  // Ahora TODA etiqueta los tiene: si viene de catálogo, la base de datos
  // los copia automáticamente desde la prenda (ver trigger en la
  // migración SQL); si es libre, se guardan tal cual los escribió la
  // persona. Esto es lo que permite buscar "prendas relacionadas" sin
  // importar de dónde salió la etiqueta.
  nombre_texto: string | null;
  marca_texto: string | null;
  precio_manual: number | null;
  estilo_id: string | null;
  created_at: string;
}

export interface PrendaCatalogo {
  id: string;
  nombre: string;
  marca_id: string;
  marca_nombre: string;
  // Puede venir null desde buscar_prendas() (prendas sin precio cargado
  // en el catálogo) — antes estaba tipado como "number" sin serlo en la
  // práctica, lo que rompía el .toLocaleString() en SelectorTipoEtiqueta.
  precio: number | null;
  imagen_url: string;
}

// ── Prenda "relacionada" que devuelve la función SQL prendas_relacionadas ──
export interface PrendaRelacionada {
  etiqueta_id: string;
  publicacion_id: string;
  nombre_texto: string;
  marca_texto: string | null;
  imagen_prenda: string | null;
  imagen_publicacion: string | null;
  precio: number | null;
  url_tienda: string | null;
  activa: boolean | null;
  /** 1 = casi idéntica (misma marca y nombre), 2 = misma marca, 3 = mismo tipo de prenda */
  nivel: 1 | 2 | 3 | 4;
  score: number;
}

// =========================================================================
// Crear etiqueta — punto único de entrada, unifica lo que antes eran
// crearEtiquetaCatalogo / crearEtiquetaManual. Si viene prendaId, queda
// enlazada al catálogo (precio/tienda reales); si no, queda como texto
// libre. En ambos casos se guarda nombreTexto/marcaTexto para que el
// buscador de relacionadas funcione igual.
// =========================================================================
export async function crearEtiqueta(params: {
  publicacionId: string;
  posX: number;
  posY: number;
  nombreTexto: string;
  marcaTexto?: string;
  prendaId?: string | null;
  precioManual?: number;
  estiloId?: string | null;
}) {
  const { data, error } = await supabase
    .from('etiquetas')
    .insert({
      publicacion_id: params.publicacionId,
      pos_x: params.posX,
      pos_y: params.posY,
      es_manual: !params.prendaId,
      prenda_id: params.prendaId ?? null,
      nombre_texto: params.nombreTexto,
      marca_texto: params.marcaTexto ?? null,
      precio_manual: params.prendaId ? null : (params.precioManual ?? null),
      estilo_id: params.estiloId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Etiqueta;
}

// ── Wrappers de compatibilidad ──────────────────────────────────────────
// Se mantienen porque PCrearPublicacionMarca.tsx / SelectorPrendaPropia.tsx
// (panel de marca) siguen llamando a estas dos funciones tal cual — el
// panel de marca solo etiqueta su propio catálogo, así que no necesita el
// formulario unificado. No hay que tocar esos archivos.
export async function crearEtiquetaCatalogo(params: {
  publicacionId: string;
  posX: number;
  posY: number;
  prendaId: string;
  estiloId?: string | null;
}) {
  return crearEtiqueta({
    publicacionId: params.publicacionId,
    posX: params.posX,
    posY: params.posY,
    prendaId: params.prendaId,
    nombreTexto: '', // el trigger de la base de datos lo sobreescribe desde la prenda
    estiloId: params.estiloId,
  });
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
  return crearEtiqueta({
    publicacionId: params.publicacionId,
    posX: params.posX,
    posY: params.posY,
    nombreTexto: params.nombreManual,
    marcaTexto: params.marcaManual,
    precioManual: params.precioManual,
    estiloId: params.estiloId,
  });
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

// Se usa para las sugerencias en vivo mientras la persona escribe marca/nombre
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

// =========================================================================
// Prendas relacionadas (RF nuevo): dado marca + nombre de una etiqueta,
// trae otras etiquetas parecidas en toda la app, ordenadas por nivel
// (1 = casi idéntica, 2 = misma marca, 3 = mismo tipo de prenda).
// =========================================================================
export async function buscarPrendasRelacionadas(
  marca: string | null | undefined,
  nombre: string,
  etiquetaId?: string
): Promise<PrendaRelacionada[]> {
  if (!nombre || nombre.trim().length < 2) return [];

  const { data, error } = await supabase.rpc('prendas_relacionadas', {
    p_marca: marca ?? '',
    p_nombre: nombre.trim(),
    p_etiqueta_id: etiquetaId ?? null,
  });

  if (error) throw error;
  return data as PrendaRelacionada[];
}
