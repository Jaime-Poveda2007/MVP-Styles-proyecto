// src/features/notificaciones/useNotificaciones.ts
//
// Contador de notificaciones no leídas para el badge de la campana en
// PFeed.tsx, con actualización en vivo por Realtime — mismo patrón de
// canal por-destinatario que useLikes.ts/useReposts.ts.
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { contarNoLeidas, marcarTodasLeidas } from './notificaciones.api';

interface Resultado {
  noLeidas: number;
  marcarLeidas: () => Promise<void>;
}

export function useNotificaciones(destinoId: string, esDeMarca: boolean = false): Resultado {
  const [noLeidas, setNoLeidas] = useState(0);
  const instanciaIdRef = useRef(Math.random().toString(36).slice(2, 10));
  const columna = esDeMarca ? 'marca_id' : 'usuario_id';

  useEffect(() => {
    let activo = true;
    contarNoLeidas(esDeMarca ? { marcaId: destinoId } : { usuarioId: destinoId })
      .then(n => { if (activo) setNoLeidas(n); })
      .catch(() => {});

    const canal = supabase
      .channel(`notificaciones_${destinoId}_${instanciaIdRef.current}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `${columna}=eq.${destinoId}` },
        () => setNoLeidas(prev => prev + 1)
      )
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, [destinoId, esDeMarca, columna]);

  const marcarLeidas = useCallback(async () => {
    setNoLeidas(0);
    try {
      await marcarTodasLeidas(esDeMarca ? { marcaId: destinoId } : { usuarioId: destinoId });
    } catch {
      // el badge ya bajó a 0 de forma optimista; si falla, se recalcula
      // solo en la próxima carga de PFeed.
    }
  }, [destinoId, esDeMarca]);

  return { noLeidas, marcarLeidas };
}
