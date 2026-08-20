// src/features/notificaciones/notificaciones.api.ts
//
// Panel de notificaciones: like/repost recibidos (usuario o marca) y,
// solo para marca, etiquetas/reseñas de sus prendas. Las filas las
// crean exclusivamente los triggers de la base de datos (ver
// database/styles_database.sql, sección "TRIGGERS DE
// NOTIFICACIONES") — este archivo solo lee y marca como leídas.
import { supabase } from '../../lib/supabase';

export type TipoNotificacion = 'like' | 'repost' | 'etiqueta' | 'reseña';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  leida: boolean;
  created_at: string;
  publicacion_id: string | null;
  prenda_id: string | null;
  actor_usuario: { id: string; username: string; foto_url: string | null } | null;
  actor_marca: { id: string; nombre: string; logo_url: string | null } | null;
  prenda: { nombre: string } | null;
}

// Destinatario: exactamente uno de los dos, igual que el resto de la
// app (esDeMarca decide cuál).
export interface Destinatario {
  usuarioId?: string;
  marcaId?: string;
}

const PAGE_SIZE = 20;

const SELECT = `
  id, tipo, leida, created_at, publicacion_id, prenda_id,
  actor_usuario:usuarios!notificaciones_actor_usuario_id_fkey ( id, username, foto_url ),
  actor_marca:marcas!notificaciones_actor_marca_id_fkey ( id, nombre, logo_url ),
  prenda:prendas!notificaciones_prenda_id_fkey ( nombre )
`;

export async function listarNotificaciones(destino: Destinatario, offset = 0): Promise<Notificacion[]> {
  const query = supabase
    .from('notificaciones')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  const { data, error } = destino.marcaId
    ? await query.eq('marca_id', destino.marcaId)
    : await query.eq('usuario_id', destino.usuarioId!);
  if (error) throw error;
  return (data ?? []).map((n: any) => ({
    ...n,
    actor_usuario: Array.isArray(n.actor_usuario) ? n.actor_usuario[0] ?? null : n.actor_usuario ?? null,
    actor_marca: Array.isArray(n.actor_marca) ? n.actor_marca[0] ?? null : n.actor_marca ?? null,
    prenda: Array.isArray(n.prenda) ? n.prenda[0] ?? null : n.prenda ?? null,
  })) as Notificacion[];
}

export async function contarNoLeidas(destino: Destinatario): Promise<number> {
  const query = supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('leida', false);
  const { count, error } = destino.marcaId
    ? await query.eq('marca_id', destino.marcaId)
    : await query.eq('usuario_id', destino.usuarioId!);
  if (error) throw error;
  return count ?? 0;
}

export async function marcarTodasLeidas(destino: Destinatario): Promise<void> {
  const query = supabase.from('notificaciones').update({ leida: true }).eq('leida', false);
  const { error } = destino.marcaId
    ? await query.eq('marca_id', destino.marcaId)
    : await query.eq('usuario_id', destino.usuarioId!);
  if (error) throw error;
}
