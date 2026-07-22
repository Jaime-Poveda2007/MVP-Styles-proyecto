// src/features/reseñas/useReseña.ts
//
// Versión completa: además del promedio, trae "mi reseña" y expone
// guardar/eliminar. Se usa SOLO dentro de PReseñasPrenda.tsx (la
// pantalla dedicada), no en los resúmenes chiquitos que aparecen en
// PDetalle.tsx (esos usan usePromedioPrenda.ts, más liviano).
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Reseña, obtenerMiReseña, guardarReseña, eliminarReseña, obtenerPromedio } from './reseñas.api';

interface Params {
  prendaId: string;
  usuarioId: string;
}

export function useReseña({ prendaId, usuarioId }: Params) {
  const [miReseña, setMiReseña] = useState<Reseña | null>(null);
  const [promedio, setPromedio] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [propia, resumen] = await Promise.all([
      obtenerMiReseña(prendaId, usuarioId),
      obtenerPromedio(prendaId),
    ]);
    setMiReseña(propia);
    setPromedio(resumen.promedio);
    setTotal(resumen.total);
    setCargando(false);
  }, [prendaId, usuarioId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Cambios de CUALQUIER persona sobre esta prenda (RNF 2.1)
  useEffect(() => {
    const canal = supabase
      .channel(`reseñas_prenda_full_${prendaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reseñas', filter: `prenda_id=eq.${prendaId}` },
        () => { obtenerPromedio(prendaId).then((r) => { setPromedio(r.promedio); setTotal(r.total); }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [prendaId]);

  const guardar = useCallback(async (estrellas: number, comentario?: string): Promise<boolean> => {
    setGuardando(true);
    try {
      const reseña = await guardarReseña({ prendaId, usuarioId, estrellas, comentario });
      setMiReseña(reseña);
      const resumen = await obtenerPromedio(prendaId);
      setPromedio(resumen.promedio);
      setTotal(resumen.total);
      return true;
    } catch {
      return false;
    } finally {
      setGuardando(false);
    }
  }, [prendaId, usuarioId]);

  const eliminar = useCallback(async () => {
    if (!miReseña) return;
    setGuardando(true);
    try {
      await eliminarReseña(miReseña.id);
      setMiReseña(null);
      const resumen = await obtenerPromedio(prendaId);
      setPromedio(resumen.promedio);
      setTotal(resumen.total);
    } finally {
      setGuardando(false);
    }
  }, [miReseña, prendaId]);

  return { miReseña, promedio, total, cargando, guardando, guardar, eliminar };
}