// src/features/perfil/reposts.api.ts
import { supabase } from '../../lib/supabase';
import { Publicacion } from '../feed/types';

const SELECT = `
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

export interface RepostConOriginal {
  repostId: string;
  repostedAt: string;
  publicacion: Publicacion;
}

// RF-U06: pestaña "Reposts" del perfil — trae los reposts del usuario
// junto con la publicación original completa (para mostrar crédito al
// autor original: usuario/marca ya vienen enriquecidos).
export async function listarMisReposts(userId: string): Promise<RepostConOriginal[]> {
  const { data: reposts, error } = await supabase
    .from('reposts')
    .select('id, created_at, publicacion_id')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!reposts || reposts.length === 0) return [];

  const ids = reposts.map(r => r.publicacion_id);
  const { data: publicaciones, error: errPub } = await supabase
    .from('publicaciones')
    .select(SELECT)
    .in('id', ids);
  if (errPub) throw errPub;

  const [{ data: misLikes }, { data: misReposts }] = await Promise.all([
    supabase.from('likes').select('publicacion_id').eq('usuario_id', userId).in('publicacion_id', ids),
    supabase.from('reposts').select('publicacion_id').eq('usuario_id', userId).in('publicacion_id', ids),
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

  // Contadores reales (los de arriba quedaron en 0 como placeholder)
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

// Deshacer repost directamente desde el perfil (sin pasar por el hook
// de la publicación, que vive en el detalle/feed).
export async function eliminarRepost(repostId: string): Promise<void> {
  const { error } = await supabase.from('reposts').delete().eq('id', repostId);
  if (error) throw error;
}