// src/features/marcas/perfil/components/TabPublicacionesMarca.tsx
//
// Cuerpo de la pestaña "Publicaciones" del perfil de marca (propio y
// público) — carga y pagina sus propias publicaciones vía FeedGrid,
// independiente de las otras pestañas.
import React, { useCallback, useEffect, useState } from 'react';
import { listarPublicacionesDeMarca } from '../../marcas.api';
import FeedGrid from '../../../feed/FeedGrid';
import { Publicacion } from '../../../feed/types';

const PAGE_SIZE = 10;

interface Props {
  marcaId: string;
  userId: string;
  esDeMarca?: boolean;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
  onAbrirDetalle: (item: Publicacion) => void;
}

export default function TabPublicacionesMarca({
  marcaId, userId, esDeMarca = false, onVerPerfil, onAbrirDetalle,
}: Props) {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const primeras = await listarPublicacionesDeMarca(marcaId, 0);
      setPublicaciones(primeras);
      setHayMas(primeras.length >= PAGE_SIZE);
    } catch {
      // dejar lista vacía visible, el header ya maneja errores del perfil en general
    } finally {
      setCargando(false);
    }
  }, [marcaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarMas = async () => {
    if (cargandoMas || !hayMas) return;
    setCargandoMas(true);
    try {
      const siguientes = await listarPublicacionesDeMarca(marcaId, publicaciones.length);
      setPublicaciones(prev => [...prev, ...siguientes]);
      setHayMas(siguientes.length >= PAGE_SIZE);
    } catch {
      // dejar lo ya cargado visible
    } finally {
      setCargandoMas(false);
    }
  };

  return (
    <FeedGrid
      publicaciones={publicaciones}
      userId={userId}
      cargando={cargando}
      cargandoMas={cargandoMas}
      hayMas={hayMas}
      refrescando={false}
      onCargarMas={cargarMas}
      onRefrescar={cargar}
      onPressTarjeta={onAbrirDetalle}
      onVerPerfil={onVerPerfil}
      esDeMarca={esDeMarca}
    />
  );
}
