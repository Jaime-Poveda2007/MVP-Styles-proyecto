// src/features/feed/useFeed.ts
import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Publicacion } from './types';

const PAGE_SIZE = 10;
const MAX_MARCAS_POR_PAGINA = 2; // proporción 1:5

interface UseFeedResult {
  publicaciones: Publicacion[];
  cargando: boolean;
  cargandoMas: boolean;
  error: string | null;
  hayMas: boolean;
  cargarPrimera: (userId: string) => Promise<void>;
  cargarMas: () => Promise<void>;
  refrescar: () => Promise<void>;
}

export function useFeed(): UseFeedResult {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(true);

  const userIdRef = useRef<string>('');
  const offsetRef = useRef<number>(0);
  const preferenciasRef = useRef<{ estilos: string[]; colores: string[] }>({ estilos: [], colores: [] });

  const obtenerPreferencias = async (userId: string) => {
    const { data } = await supabase
      .from('preferencias_usuario')
      .select('estilos, colores')
      .eq('usuario_id', userId)
      .single();
    return { estilos: data?.estilos ?? [], colores: data?.colores ?? [] };
  };

  const enriquecer = async (posts: any[], setLikes: Set<string>): Promise<Publicacion[]> => {
    return Promise.all(posts.map(async (p) => {
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
        etiquetas: p.etiquetas ?? [],
      } as Publicacion;
    }));
  };

  const fetchPagina = async (userId: string, offset: number): Promise<Publicacion[]> => {
    const SELECT = `
      id, imagen_url, descripcion, es_de_marca, created_at,
      usuario_id, marca_id,
      usuario:usuarios!publicaciones_usuario_id_fkey ( id, nombre, username, foto_url ),
      marca:marcas!publicaciones_marca_id_fkey ( id, nombre, logo_url ),
     etiquetas (
        id, pos_x, pos_y, es_manual,
        nombre_manual, marca_manual, precio_manual,
        prenda:prendas ( id, nombre, precio, imagen_url, url_tienda, activa, marca:marcas ( nombre ) ),
        estilo:estilos ( nombre )
      )
    `;

    const [{ data: postsUsuarios, error: errU }, { data: postsMarcas, error: errM }] = await Promise.all([
      supabase.from('publicaciones').select(SELECT)
        .eq('es_de_marca', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1),
      supabase.from('publicaciones').select(SELECT)
        .eq('es_de_marca', true)
        .order('created_at', { ascending: false })
        .range(Math.floor(offset / PAGE_SIZE) * MAX_MARCAS_POR_PAGINA,
          Math.floor(offset / PAGE_SIZE) * MAX_MARCAS_POR_PAGINA + MAX_MARCAS_POR_PAGINA - 1),
    ]);

    if (errU) throw errU;
    if (errM) throw errM;

    const todosIds = [...(postsUsuarios ?? []), ...(postsMarcas ?? [])].map((p: any) => p.id);
    const { data: misLikes } = todosIds.length
      ? await supabase.from('likes').select('publicacion_id').eq('usuario_id', userId).in('publicacion_id', todosIds)
      : { data: [] };

    const setLikes = new Set((misLikes ?? []).map((l: any) => l.publicacion_id));

    const [usuariosE, marcasE] = await Promise.all([
      enriquecer(postsUsuarios ?? [], setLikes),
      enriquecer(postsMarcas ?? [], setLikes),
    ]);

    // Intercalar 1:5
    const resultado: Publicacion[] = [];
    let mi = 0;
    usuariosE.forEach((post, i) => {
      resultado.push(post);
      if ((i + 1) % 5 === 0 && mi < marcasE.length) resultado.push(marcasE[mi++]);
    });
    return resultado;
  };

  const cargarPrimera = useCallback(async (userId: string) => {
    setCargando(true);
    setError(null);
    try {
      userIdRef.current = userId;
      offsetRef.current = 0;
      preferenciasRef.current = await obtenerPreferencias(userId);
      const pagina = await fetchPagina(userId, 0);
      setPublicaciones(pagina);
      setHayMas(pagina.length >= PAGE_SIZE);
      offsetRef.current = PAGE_SIZE;
    } catch (e: any) {
      setError(e.message ?? 'Error cargando el feed');
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarMas = useCallback(async () => {
    if (cargandoMas || !hayMas) return;
    setCargandoMas(true);
    try {
      const pagina = await fetchPagina(userIdRef.current, offsetRef.current);
      setPublicaciones(prev => [...prev, ...pagina]);
      setHayMas(pagina.length >= PAGE_SIZE);
      offsetRef.current += PAGE_SIZE;
    } catch (e: any) {
      setError(e.message ?? 'Error cargando más');
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMas]);

  const refrescar = useCallback(async () => {
    await cargarPrimera(userIdRef.current);
  }, [cargarPrimera]);

  return { publicaciones, cargando, cargandoMas, error, hayMas, cargarPrimera, cargarMas, refrescar };
}