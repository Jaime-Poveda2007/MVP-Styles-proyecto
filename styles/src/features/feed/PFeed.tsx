// src/features/feed/PFeed.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFeed } from './useFeed';
import FeedGrid from './FeedGrid';
import PDetalle from './PDetalle';
import { Publicacion } from './types';
import { FeedStackParamList } from './NavFeed';
import { obtenerPublicacionPorId } from './services/publicacionesService';
import { useTheme } from '../../shared/ThemeContext';
import EstadoError from '../../shared/components/EstadoError';
import MensajeMotivacional from './MensajeMotivacional';
import { useNotificaciones } from '../notificaciones/useNotificaciones';
import JoystickMenu, { OpcionJoystick } from '../../shared/components/JoystickMenu';

interface Props {
  userId: string;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
  esDeMarca?: boolean;
}

type Nav = NativeStackNavigationProp<FeedStackParamList>;

export default function PFeed({ userId, onVerPerfil, esDeMarca = false }: Props) {
  const { C } = useTheme();
  const navigation = useNavigation<Nav>();
  const { publicaciones, cargando, cargandoMas, error, hayMas, cargarPrimera, cargarMas, refrescar } = useFeed();
  const [refrescando, setRefrescando] = useState(false);
  const [detalle, setDetalle] = useState<Publicacion | null>(null);
  // Ya no se usa para pintar una campana en el header (se sacó de acá):
  // ahora "noLeidas" solo alimenta el badge del botón central del joystick.
  const { noLeidas } = useNotificaciones(userId, esDeMarca);

  const f = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.white },
    // Header simplificado: ya no tiene barra de búsqueda ni campana de
    // notificaciones — ambas se consolidaron en el menú joystick (ver
    // más abajo, handleSeleccionJoystick), junto con Perfil.
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

  // Reutilizada por el caso 'agregar' del menú radial — ya no hay un
  // toque corto que la dispare directamente.
  const irACrearPublicacion = () => navigation.navigate('CrearPublicacion');

  // Mantener presionado + deslizar: menú radial con las 4 acciones que
  // antes estaban repartidas entre el header (buscar, campana) y el tab
  // bar (perfil). Todas navegan dentro del mismo FeedStack (ver NavFeed.tsx,
  // que ahora incluye la pantalla "Perfil" con su propia flecha de volver).
  const handleSeleccionJoystick = (opcion: OpcionJoystick) => {
    switch (opcion) {
      case 'agregar':
        irACrearPublicacion();
        break;
      case 'buscar':
        navigation.navigate('Busqueda', { userId });
        break;
      case 'notificaciones':
        navigation.navigate('Notificaciones');
        break;
      case 'perfil':
        navigation.navigate('Perfil');
        break;
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
          ahora viven en el menú joystick */}
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

      {/* Botón central — sin ícono propio ni acción por toque directo.
          Mantener presionado + deslizar = menú radial con Buscar, Perfil,
          Agregar publicación y Notificaciones (con badge de no leídas).
          La marca sigue publicando desde su propio panel, no desde acá. */}
      {!esDeMarca && (
        <JoystickMenu
          onSeleccionar={handleSeleccionJoystick}
          notificacionesNoLeidas={noLeidas}
        />
      )}

    </SafeAreaView>
  );
}
