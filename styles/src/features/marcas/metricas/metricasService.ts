// src/features/marcas/metricas/metricasService.ts
//
// RF-M05: panel de métricas de marca — consultas en vivo (COUNT sobre
// etiquetas/clics_tienda/likes/reposts filtradas por fecha), sin tabla
// "metricas_marca" ni Edge Functions/triggers. Decisión de producto
// para mantener el MVP simple (equipo de 2 personas, presupuesto $0).
import { supabase } from '../../../lib/supabase';
import { listarPrendasDeLaMarca } from '../catalogo/services/prendasService';
import { Prenda } from '../catalogo/types';

export type RangoMetricas = 'semana' | 'mes';

export interface MetricaPrenda {
  prenda: Prenda;
  etiquetados: number;
  clics: number;
}

export interface TotalesMarca {
  likes: number;
  reposts: number;
}

function fechaDesde(rango: RangoMetricas): string {
  const desde = new Date();
  if (rango === 'semana') desde.setDate(desde.getDate() - 7);
  else desde.setMonth(desde.getMonth() - 1);
  return desde.toISOString();
}

// Cuenta filas por prenda_id a partir de un arreglo plano — Supabase JS
// no soporta GROUP BY del lado del servidor, y a esta escala (máx. 200
// prendas activas por marca) reducir en el cliente es suficiente.
function contarPorPrenda(filas: { prenda_id: string }[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const fila of filas) {
    mapa.set(fila.prenda_id, (mapa.get(fila.prenda_id) ?? 0) + 1);
  }
  return mapa;
}

export async function obtenerMetricasPorPrenda(
  marcaId: string,
  rango: RangoMetricas
): Promise<MetricaPrenda[]> {
  const prendas = await listarPrendasDeLaMarca(marcaId);
  if (prendas.length === 0) return [];

  const ids = prendas.map(p => p.id);
  const desde = fechaDesde(rango);

  const [{ data: etiquetas, error: errEtq }, { data: clics, error: errClics }] = await Promise.all([
    supabase.from('etiquetas').select('prenda_id').in('prenda_id', ids).gte('created_at', desde),
    supabase.from('clics_tienda').select('prenda_id').in('prenda_id', ids).gte('created_at', desde),
  ]);
  if (errEtq) throw errEtq;
  if (errClics) throw errClics;

  const mapaEtiquetados = contarPorPrenda((etiquetas ?? []) as { prenda_id: string }[]);
  const mapaClics = contarPorPrenda((clics ?? []) as { prenda_id: string }[]);

  return prendas.map(prenda => ({
    prenda,
    etiquetados: mapaEtiquetados.get(prenda.id) ?? 0,
    clics: mapaClics.get(prenda.id) ?? 0,
  }));
}

export async function obtenerTotalesPublicaciones(
  marcaId: string,
  rango: RangoMetricas
): Promise<TotalesMarca> {
  const { data: publicaciones, error: errPub } = await supabase
    .from('publicaciones')
    .select('id')
    .eq('marca_id', marcaId);
  if (errPub) throw errPub;

  const ids = (publicaciones ?? []).map((p: any) => p.id);
  if (ids.length === 0) return { likes: 0, reposts: 0 };

  const desde = fechaDesde(rango);
  const [{ count: likes, error: errLikes }, { count: reposts, error: errReposts }] = await Promise.all([
    supabase.from('likes').select('*', { count: 'exact', head: true }).in('publicacion_id', ids).gte('created_at', desde),
    supabase.from('reposts').select('*', { count: 'exact', head: true }).in('publicacion_id', ids).gte('created_at', desde),
  ]);
  if (errLikes) throw errLikes;
  if (errReposts) throw errReposts;

  return { likes: likes ?? 0, reposts: reposts ?? 0 };
}
