// src/features/feed/useLikes.ts
//
// Lógica de Likes (RF-U06) centralizada para no duplicarla entre
// FeedCard.tsx y PDetalle.tsx:
//
//  - Toggle optimista: la persona ve el cambio al instante; si el
//    insert/delete en Supabase falla, se revierte.
//  - Realtime: las acciones de OTRAS personas sobre esta misma
//    publicación llegan por Supabase Realtime y actualizan el contador
//    en vivo. (Requiere tener Realtime habilitado en la tabla "likes",
//    ver supabase_realtime.sql).
//  - Bloqueo de like propio: si "esPropia" es true, toggleLike no hace
//    nada (y devuelve false) — la UI decide cómo comunicarlo.
//
// Por qué no se duplica el contador del propio usuario en Realtime:
// el canal ignora cualquier evento cuyo usuario_id sea el mismo userId
// actual, porque esa acción ya quedó reflejada por el toggle optimista.
// Así evitamos contar dos veces el propio like.
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface UseLikesParams {
  publicacionId: string;
  userId: string;
  esPropia: boolean;
  likesInicial: number;
  yoLikeInicial: boolean;
}

interface UseLikesResultado {
  likes: number;
  yoLike: boolean;
  toggling: boolean;
  toggleLike: () => Promise<boolean>; // false si estaba bloqueado o falló
}

export function useLikes({
  publicacionId, userId, esPropia, likesInicial, yoLikeInicial,
}: UseLikesParams): UseLikesResultado {
  const [likes, setLikes] = useState(likesInicial);
  const [yoLike, setYoLike] = useState(yoLikeInicial);
  const [toggling, setToggling] = useState(false);

  // Evita condiciones de carrera si el usuario toca varias veces rápido
  const enVueloRef = useRef(false);

  // Sufijo único por instancia montada (no solo por publicacionId): con
  // el tab de Perfil, React Navigation mantiene montados el tab de Feed
  // Y el de Perfil a la vez (no se desmontan al cambiar de pestaña), así
  // que una misma publicación puede aparecer en dos FeedCard vivos al
  // mismo tiempo (uno en el feed, otro en el perfil). Si ambos usaran el
  // mismo nombre de canal, Supabase reutiliza el objeto ya suscrito y el
  // segundo .on() revienta con "cannot add callbacks ... after
  // subscribe()". Con un id de instancia cada montaje tiene su propio
  // canal independiente, aunque escuchen la misma publicación.
  const instanciaIdRef = useRef(Math.random().toString(36).slice(2, 10));

  useEffect(() => {
    const canal = supabase
      .channel(`likes_pub_${publicacionId}_${instanciaIdRef.current}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes', filter: `publicacion_id=eq.${publicacionId}` },
        (payload) => {
          const filaUsuarioId = (payload.new as { usuario_id: string }).usuario_id;
          if (filaUsuarioId === userId) return; // ya lo contamos de forma optimista
          setLikes(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'likes', filter: `publicacion_id=eq.${publicacionId}` },
        (payload) => {
          const filaUsuarioId = (payload.old as { usuario_id: string })?.usuario_id;
          if (filaUsuarioId === userId) return;
          setLikes(prev => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [publicacionId, userId]);

  const toggleLike = useCallback(async (): Promise<boolean> => {
    if (esPropia || enVueloRef.current) return false;
    enVueloRef.current = true;
    setToggling(true);

    const nuevoEstado = !yoLike;
    setYoLike(nuevoEstado);
    setLikes(prev => prev + (nuevoEstado ? 1 : -1));

    try {
      const { error } = nuevoEstado
        ? await supabase.from('likes').insert({ usuario_id: userId, publicacion_id: publicacionId })
        : await supabase.from('likes').delete().eq('usuario_id', userId).eq('publicacion_id', publicacionId);

      if (error) throw error;
      return true;
    } catch {
      // Revertir el optimismo si Supabase rechazó el cambio
      setYoLike(!nuevoEstado);
      setLikes(prev => prev + (nuevoEstado ? -1 : 1));
      return false;
    } finally {
      enVueloRef.current = false;
      setToggling(false);
    }
  }, [esPropia, yoLike, userId, publicacionId]);

  return { likes, yoLike, toggling, toggleLike };
}
