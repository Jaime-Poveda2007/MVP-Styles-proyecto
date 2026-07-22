// src/features/reseñas/reseñas.api.ts
//
// RF-C02: Reseñas de PRENDAS del catálogo (public.prendas), no de
// publicaciones. Una misma prenda puede estar etiquetada en varias
// publicaciones de la marca; el promedio es uno solo para esa prenda
// sin importar en cuál publicación se vea.
//
// "Editable/eliminable, una por usuario por prenda" se resuelve con
// un UNIQUE (prenda_id, usuario_id) en la BD + upsert acá.

import { supabase } from '../../lib/supabase';

export interface Reseña {
  id: string;
  prenda_id: string;
  usuario_id: string;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  updated_at: string;
}

export async function obtenerMiReseña(prendaId: string, usuarioId: string): Promise<Reseña | null> {
  const { data, error } = await supabase
    .from('reseñas')
    .select('*')
    .eq('prenda_id', prendaId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function guardarReseña(params: {
  prendaId: string;
  usuarioId: string;
  estrellas: number;
  comentario?: string;
}): Promise<Reseña> {
  const { data, error } = await supabase
    .from('reseñas')
    .upsert(
      {
        prenda_id: params.prendaId,
        usuario_id: params.usuarioId,
        estrellas: params.estrellas,
        comentario: params.comentario?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'prenda_id,usuario_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Reseña;
}

export async function eliminarReseña(reseñaId: string): Promise<void> {
  const { error } = await supabase.from('reseñas').delete().eq('id', reseñaId);
  if (error) throw error;
}

export async function obtenerPromedio(prendaId: string): Promise<{ promedio: number | null; total: number }> {
  const { data, error } = await supabase
    .from('reseñas')
    .select('estrellas')
    .eq('prenda_id', prendaId);
  if (error) throw error;
  const total = data?.length ?? 0;
  const promedio = total > 0 ? data!.reduce((acc, r) => acc + r.estrellas, 0) / total : null;
  return { promedio, total };
}

// ── Listado completo para la pantalla dedicada de reseñas de la prenda ──
export interface ReseñaConAutor extends Reseña {
  usuario: { username: string; foto_url: string | null } | null;
}

export async function listarReseñas(prendaId: string): Promise<ReseñaConAutor[]> {
  const { data, error } = await supabase
    .from('reseñas')
    .select('*, usuario:usuarios ( username, foto_url )')
    .eq('prenda_id', prendaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    usuario: Array.isArray(r.usuario) ? r.usuario[0] ?? null : r.usuario ?? null,
  })) as ReseñaConAutor[];
}