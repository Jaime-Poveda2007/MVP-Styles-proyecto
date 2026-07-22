// src/features/reseñas/usePromedioPrenda.ts
//
// Versión liviana de useReseña.ts: solo trae promedio + total y los
// mantiene en vivo con Realtime (RNF 2.1). No carga "mi reseña" ni
// expone guardar/eliminar — eso vive en useReseña.ts, usado solo
// dentro de la pantalla dedicada PReseñasPrenda.tsx. Este hook es el
// que se usa en varios lugares a la vez dentro de PDetalle.tsx (el pin
// de cada etiqueta y cada fila de "Prendas en este look"), así que
// conviene que sea barato.
//
// IMPORTANTE: la misma prenda puede aparecer renderizada dos veces al
// mismo tiempo en PDetalle.tsx — una vez en el popup del pin y otra en
// la fila de "Prendas en este look". Si ambos canales de Realtime
// usaran el mismo nombre (basado solo en prendaId), Supabase truena
// con "cannot add postgres_changes callbacks ... after subscribe()"
// porque el segundo choca contra el canal que el primero ya suscribió.
// Por eso cada instancia del hook agrega un sufijo aleatorio propio
// (generado una sola vez con useRef) al nombre del canal.
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { obtenerPromedio } from './reseñas.api';

export function usePromedioPrenda(prendaId: string) {
  const [promedio, setPromedio] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  // Único por instancia del hook, estable mientras el componente esté montado.
  const instanciaIdRef = useRef(Math.random().toString(36).slice(2));

  const cargar = useCallback(async () => {
    const r = await obtenerPromedio(prendaId);
    setPromedio(r.promedio);
    setTotal(r.total);
    setCargando(false);
  }, [prendaId]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const canal = supabase
      .channel(`reseñas_prenda_${prendaId}_${instanciaIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reseñas', filter: `prenda_id=eq.${prendaId}` },
        () => { obtenerPromedio(prendaId).then((r) => { setPromedio(r.promedio); setTotal(r.total); }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [prendaId]);

  return { promedio, total, cargando };
}