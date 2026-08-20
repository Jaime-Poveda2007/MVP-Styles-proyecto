// src/features/perfil/PPerfil.tsx
//
// RF-U10: pantalla de perfil propio — foto, nombre, biografía y
// cuadrícula de publicaciones propias. Punto de entrada al resto del
// módulo de perfil: editar perfil, editar preferencias de estilo,
// ver los reposts propios (PMisReposts.tsx, antes huérfano) y cerrar
// sesión (se mueve acá desde el botón temporal de PFeed.tsx).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Settings, Repeat2, Sparkles } from 'lucide-react-native';
import ImagenConCarga from '../../shared/components/ImagenConCarga';
import FeedGrid from '../feed/FeedGrid';
import PDetalle from '../feed/PDetalle';
import { Publicacion } from '../feed/types';
import { obtenerPerfilPropio, listarPublicacionesDeUsuario, PerfilUsuario } from './perfil.api';
import { obtenerPublicacionPorId } from '../feed/services/publicacionesService';
import EstadoError from '../../shared/components/EstadoError';
import { C, R } from '../../shared/theme';

const PAGE_SIZE = 10;

interface Props {
  userId: string;
  onEditarPerfil: () => void;
  onEditarPreferencias: () => void;
  onMisReposts: () => void;
  onCerrarSesion: () => void;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
}

export default function PPerfil({
  userId, onEditarPerfil, onEditarPreferencias, onMisReposts, onCerrarSesion, onVerPerfil,
}: Props) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [detalle, setDetalle] = useState<Publicacion | null>(null);
  // Guarda sincrónico (no el estado, que es asíncrono) contra doble
  // disparo de onEndReached — con pocas publicaciones el FlatList no
  // llena la pantalla y puede llamarlo dos veces casi a la vez antes
  // de que "cargandoMas" se refleje, duplicando la página pedida y
  // repitiendo publicaciones (lo que a su vez rompía la suscripción
  // de Realtime de useLikes al montar dos FeedCard con el mismo id).
  const cargandoMasRef = useRef(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [datosPerfil, primerasPublicaciones] = await Promise.all([
        obtenerPerfilPropio(userId),
        listarPublicacionesDeUsuario(userId, 0),
      ]);
      setPerfil(datosPerfil);
      setPublicaciones(primerasPublicaciones);
      setHayMas(primerasPublicaciones.length >= PAGE_SIZE);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar tu perfil.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarMas = async () => {
    if (cargandoMasRef.current || !hayMas) return;
    cargandoMasRef.current = true;
    setCargandoMas(true);
    try {
      const siguientes = await listarPublicacionesDeUsuario(userId, publicaciones.length);
      setPublicaciones(prev => [...prev, ...siguientes]);
      setHayMas(siguientes.length >= PAGE_SIZE);
    } catch {
      // Si falla la siguiente página, mejor dejar lo ya cargado visible
    } finally {
      cargandoMasRef.current = false;
      setCargandoMas(false);
    }
  };

  const onRefrescar = () => { setRefrescando(true); cargar(); };

  const abrirDetalle = async (item: Publicacion) => {
    try {
      setDetalle(await obtenerPublicacionPorId(item.id, userId));
    } catch (e) {
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
        onEliminado={() => { setDetalle(null); cargar(); }}
        onVerPerfil={onVerPerfil}
      />
    );
  }

  if (cargando) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centrado}><ActivityIndicator color={C.earth} /></View>
      </SafeAreaView>
    );
  }

  if (!perfil) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centrado}>
          <EstadoError mensaje={error ?? 'No se pudo cargar tu perfil.'} onReintentar={cargar} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        {perfil.foto_url
          ? <ImagenConCarga uri={perfil.foto_url} style={s.avatar} />
          : <View style={[s.avatar, s.avatarPH]}><Text style={s.avatarLetra}>{perfil.nombre[0]?.toUpperCase() ?? '?'}</Text></View>
        }
        <Text style={s.username}>@{perfil.username}</Text>
        <Text style={s.nombre}>{perfil.nombre}</Text>
        {perfil.biografia ? <Text style={s.bio}>{perfil.biografia}</Text> : null}

        <View style={s.accionesFila}>
          <TouchableOpacity style={s.botonSecundario} onPress={onEditarPerfil}>
            <Settings size={14} color={C.ink} strokeWidth={2} />
            <Text style={s.botonSecundarioTexto}>Editar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.botonSecundario} onPress={onEditarPreferencias}>
            <Sparkles size={14} color={C.ink} strokeWidth={2} />
            <Text style={s.botonSecundarioTexto}>Preferencias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.botonSecundario} onPress={onMisReposts}>
            <Repeat2 size={14} color={C.ink} strokeWidth={2} />
            <Text style={s.botonSecundarioTexto}>Reposts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={onCerrarSesion}>
            <LogOut size={18} color={C.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <FeedGrid
        publicaciones={publicaciones}
        userId={userId}
        cargando={false}
        cargandoMas={cargandoMas}
        hayMas={hayMas}
        refrescando={refrescando}
        onCargarMas={cargarMas}
        onRefrescar={onRefrescar}
        onPressTarjeta={abrirDetalle}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.white },
  centrado:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { alignItems: 'center', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 24, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 4 },
  avatar:      { width: 84, height: 84, borderRadius: 42, marginBottom: 8 },
  avatarPH:    { alignItems: 'center', justifyContent: 'center', backgroundColor: C.earthLight },
  avatarLetra: { fontSize: 30, fontWeight: '700', color: C.earth },
  username:    { fontSize: 16, fontWeight: '700', color: C.ink },
  nombre:      { fontSize: 13, color: C.muted },
  bio:         { fontSize: 13, color: C.ink, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 8 },
  accionesFila:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  botonSecundario: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: R.chip, paddingHorizontal: 10, paddingVertical: 8 },
  botonSecundarioTexto: { fontSize: 12, color: C.ink, fontWeight: '600' },
  iconBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
});
