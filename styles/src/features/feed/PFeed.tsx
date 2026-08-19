// src/features/feed/PFeed.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFeed } from './useFeed';
import FeedGrid from './FeedGrid';
import PDetalle from './PDetalle';
import { Publicacion } from './types';
import { FeedStackParamList } from './NavFeed';
import { obtenerPublicacionPorId } from './services/publicacionesService';
import { C } from '../../shared/theme';
import BarraBusquedaHeader from '../busqueda/components/BarraBusquedaHeader';
import EstadoError from '../../shared/components/EstadoError';

interface Props {
  userId: string;
  onVerPerfil: (targetUserId: string) => void;
  esDeMarca?: boolean;
}

type Nav = NativeStackNavigationProp<FeedStackParamList>;

export default function PFeed({ userId, onVerPerfil, esDeMarca = false }: Props) {
  const navigation = useNavigation<Nav>();
  const { publicaciones, cargando, cargandoMas, error, hayMas, cargarPrimera, cargarMas, refrescar } = useFeed();
  const [refrescando, setRefrescando] = useState(false);
  const [detalle, setDetalle] = useState<Publicacion | null>(null);

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

      {/* Header */}
      <View style={f.header}>
        <Text style={f.wordmark}>styles<Text style={f.dot}>.</Text></Text>
        <View style={f.headerDerecha}>
          <BarraBusquedaHeader
            onBuscar={(termino) => navigation.navigate('Busqueda', { terminoInicial: termino, userId })}
          />
        </View>
      </View>

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

      {/* FAB — botón temporal de crear publicación (la marca publica desde
          su propio flujo en el panel, no desde el feed general) */}
      {!esDeMarca && (
        <TouchableOpacity
          style={f.fab}
          onPress={() => navigation.navigate('CrearPublicacion')}
          activeOpacity={0.85}
        >
          <Plus size={24} color={C.white} strokeWidth={2.5} />
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}

const f = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  wordmark: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5, color: C.ink },
  dot: { color: C.earth },
  headerDerecha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fab: {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.earth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.earth,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});