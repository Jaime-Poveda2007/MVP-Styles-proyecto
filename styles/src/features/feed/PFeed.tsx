// src/features/feed/PFeed.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeed } from './useFeed';
import FeedGrid from './FeedGrid';
import PDetalle from './PDetalle';
import { Publicacion } from './types';
import { obtenerPublicacionPorId } from './services/publicacionesService';
import { useTheme } from '../../shared/ThemeContext';
import EstadoError from '../../shared/components/EstadoError';
import MensajeMotivacional from './MensajeMotivacional';

interface Props {
  userId: string;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
  esDeMarca?: boolean;
}

export default function PFeed({ userId, onVerPerfil, esDeMarca = false }: Props) {
  const { C } = useTheme();
  const { publicaciones, cargando, cargandoMas, error, hayMas, cargarPrimera, cargarMas, refrescar } = useFeed();
  const [refrescando, setRefrescando] = useState(false);
  const [detalle, setDetalle] = useState<Publicacion | null>(null);

  const f = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.white },
    // Header simplificado: ya no tiene barra de búsqueda ni campana de
    // notificaciones — ambas se consolidaron en el menú joystick, que
    // ahora se monta globalmente en App.tsx (ver JoystickGlobal.tsx).
    header: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
    wordmark: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5, color: C.ink },
    dot: { color: C.earth },
  }), [C]);

  useEffect(() => { cargarPrimera(userId, esDeMarca); }, [userId, esDeMarca]);

  const handleRefrescar = async () => {
    setRefrescando(true);
    await refrescar();
    setRefrescando(false);
  };

  const abrirDetalle = async (item: Publicacion) => {
    try {
      const fresca = await obtenerPublicacionPorId(item.id, userId, esDeMarca);
      setDetalle(fresca);
    } catch (e) {
      // No se pudo refrescar (ej. sin conexión) — se abre igual con los
      // datos que ya se tenían del feed en vez de bloquear la navegación.
      console.warn('No se pudo refrescar la publicación antes de abrirla:', e);
      setDetalle(item);
    }
  };

  if (detalle) {
    return (
      <PDetalle
        publicacion={detalle}
        userId={userId}
        onVolver={() => setDetalle(null)}
        onEliminado={() => { setDetalle(null); refrescar(); }}
        onVerPerfil={onVerPerfil}
        esDeMarca={esDeMarca}
      />
    );
  }

  return (
    <SafeAreaView style={f.safe} edges={['top']}>

      {/* Header — solo la marca; búsqueda, notificaciones y perfil
          ahora viven en el menú joystick global (App.tsx) */}
      <View style={f.header}>
        <Text style={f.wordmark}>styles<Text style={f.dot}>.</Text></Text>
      </View>

      {/* Mensaje motivacional — solo para usuarios, invita a subir outfits */}
      {!esDeMarca && <MensajeMotivacional />}

      {/* Error no bloqueante */}
      {error && !cargando && (
        <EstadoError mensaje={error} onReintentar={() => cargarPrimera(userId, esDeMarca)} />
      )}

      {/* Grid */}
      <FeedGrid
        publicaciones={publicaciones}
        userId={userId}
        cargando={cargando}
        cargandoMas={cargandoMas}
        hayMas={hayMas}
        refrescando={refrescando}
        onCargarMas={cargarMas}
        onRefrescar={handleRefrescar}
        onPressTarjeta={abrirDetalle}
        onVerPerfil={onVerPerfil}
        esDeMarca={esDeMarca}
      />

    </SafeAreaView>
  );
}
