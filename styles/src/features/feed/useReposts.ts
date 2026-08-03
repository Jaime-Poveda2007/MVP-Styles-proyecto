// src/features/feed/useReposts.ts
//
// Igual que useLikes.ts pero para reposts (RF-U06): toggle optimista +
// Realtime para que el contador se mueva en vivo cuando otra persona
// repostea/deshace repost de la misma publicación.
//
// Auto-corrección: si el estado inicial llega desactualizado (p. ej.
// la tarjeta del feed no se enteró de un repost hecho desde el
// detalle), un INSERT choca con la restricción UNIQUE porque el
// repost YA existe en el servidor. En vez de tratarlo como error (que
// dejaba a la persona sin poder deshacerlo nunca — el bug reportado),
// se detecta el conflicto (código 23505) y se autocorrige el estado
// local en vez de revertir.
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface UseRepostsParams {
  publicacionId: string;
  userId: string;
  repostsInicial: number;
  yoReposteeInicial: boolean;
}

interface UseRepostsResultado {
  reposts: number;
  yoRepostee: boolean;
  toggling: boolean;
  toggleRepost: () => Promise<boolean>;
}

export function useReposts({
  publicacionId, userId, repostsInicial, yoReposteeInicial,
}: UseRepostsParams): UseRepostsResultado {
  const [reposts, setReposts] = useState(repostsInicial);
  const [yoRepostee, setYoRepostee] = useState(yoReposteeInicial);
  const [toggling, setToggling] = useState(false);
  const enVueloRef = useRef(false);

  // Ver el comentario equivalente en useLikes.ts: con el tab de Perfil,
  // una misma publicación puede tener dos FeedCard montados a la vez
  // (feed + perfil, que React Navigation no desmonta entre pestañas).
  // El sufijo de instancia evita que ambos peleen por el mismo canal.
  const instanciaIdRef = useRef(Math.random().toString(36).slice(2, 10));

  useEffect(() => {
    const canal = supabase
      .channel(`reposts_pub_${publicacionId}_${instanciaIdRef.current}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reposts', filter: `publicacion_id=eq.${publicacionId}` },
        (payload) => {
          const filaUsuarioId = (payload.new as { usuario_id: string }).usuario_id;
          if (filaUsuarioId === userId) return; // ya contado de forma optimista
          setReposts(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reposts', filter: `publicacion_id=eq.${publicacionId}` },
        (payload) => {
          const filaUsuarioId = (payload.old as { usuario_id: string })?.usuario_id;
          if (filaUsuarioId === userId) return;
          setReposts(prev => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [publicacionId, userId]);

  const toggleRepost = useCallback(async (): Promise<boolean> => {
    if (enVueloRef.current) return false;
    enVueloRef.current = true;
    setToggling(true);

    const nuevoEstado = !yoRepostee;
    setYoRepostee(nuevoEstado);
    setReposts(prev => prev + (nuevoEstado ? 1 : -1));

    try {
      if (nuevoEstado) {
        const { error } = await supabase
          .from('reposts')
          .insert({ usuario_id: userId, publicacion_id: publicacionId });

        if (error) {
          if (error.code === '23505') {
            // El repost ya existía en el servidor (estado local
            // desincronizado). No es un fallo real: nos autocorregimos
            // dejando yoRepostee en true y recalculando el contador
            // verdadero en vez de sumar uno de más.
            const { count } = await supabase
              .from('reposts')
              .select('*', { count: 'exact', head: true })
              .eq('publicacion_id', publicacionId);
            setReposts(count ?? 0);
            return true;
          }
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('usuario_id', userId)
          .eq('publicacion_id', publicacionId);
        if (error) throw error;
      }
      return true;
    } catch {
      // Revertir el optimismo si Supabase rechazó el cambio de verdad
      // (por ejemplo, RLS bloqueando un repost a publicación propia).
      setYoRepostee(!nuevoEstado);
      setReposts(prev => prev + (nuevoEstado ? -1 : 1));
      return false;
    } finally {
      enVueloRef.current = false;
      setToggling(false);
    }
  }, [yoRepostee, userId, publicacionId]);

  return { reposts, yoRepostee, toggling, toggleRepost };
}