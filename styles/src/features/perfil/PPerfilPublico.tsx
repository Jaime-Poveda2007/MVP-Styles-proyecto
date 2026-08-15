// src/features/perfil/PPerfilPublico.tsx
//
// RF-U10: perfil público de otra persona — misma información visual
// que el perfil propio (PPerfil.tsx) pero de solo lectura: sin email,
// sin botones de edición, sin acceso a preferencias ni cierre de
// sesión ajenos.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import ImagenConCarga from '../../shared/components/ImagenConCarga';
import FeedGrid from '../feed/FeedGrid';
import PDetalle from '../feed/PDetalle';
import { Publicacion } from '../feed/types';
import { obtenerPerfilPublico, listarPublicacionesDeUsuario, PerfilUsuario } from './perfil.api';
import { obtenerPublicacionPorId } from '../feed/services/publicacionesService';
import EstadoError from '../../shared/components/EstadoError';
import { C } from '../../shared/theme';

const PAGE_SIZE = 10;

interface Props {
  targetUserId: string;
  userId: string;
  onVolver: () => void;
  onVerPerfil: (targetUserId: string) => void;
}

export default function PPerfilPublico({ targetUserId, userId, onVolver, onVerPerfil }: Props) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [detalle, setDetalle] = useState<Publicacion | null>(null);
  // Ver comentario equivalente en PPerfil.tsx: guarda sincrónico contra
  // doble disparo de onEndReached en listas cortas.
  const cargandoMasRef = useRef(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [datosPerfil, primerasPublicaciones] = await Promise.all([
        obtenerPerfilPublico(targetUserId),
        listarPublicacionesDeUsuario(targetUserId, 0),
      ]);
      setPerfil(datosPerfil);
      setPublicaciones(primerasPublicaciones);
      setHayMas(primerasPublicaciones.length >= PAGE_SIZE);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar este perfil.');
    } finally {
      setCargando(false);
    }
  }, [targetUserId]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarMas = async () => {
    if (cargandoMasRef.current || !hayMas) return;
    cargandoMasRef.current = true;
    setCargandoMas(true);
    try {
      const siguientes = await listarPublicacionesDeUsuario(targetUserId, publicaciones.length);
      setPublicaciones(prev => [...prev, ...siguientes]);
      setHayMas(siguientes.length >= PAGE_SIZE);
    } catch {
      // dejar lo ya cargado visible
    } finally {
      cargandoMasRef.current = false;
      setCargandoMas(false);
    }
  };

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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={onVolver}>
          <ChevronLeft size={22} color={C.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.topBarTitulo}>{perfil ? `@${perfil.username}` : 'Perfil'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {cargando ? (
        <View style={s.centrado}><ActivityIndicator color={C.earth} /></View>
      ) : !perfil ? (
        <View style={s.centrado}>
          <EstadoError mensaje={error ?? 'No se pudo cargar este perfil.'} onReintentar={cargar} />
        </View>
      ) : (
        <>
          <View style={s.header}>
            {perfil.foto_url
              ? <ImagenConCarga uri={perfil.foto_url} style={s.avatar} />
              : <View style={[s.avatar, s.avatarPH]}><Text style={s.avatarLetra}>{perfil.nombre[0]?.toUpperCase() ?? '?'}</Text></View>
            }
            <Text style={s.username}>@{perfil.username}</Text>
            <Text style={s.nombre}>{perfil.nombre}</Text>
            {perfil.biografia ? <Text style={s.bio}>{perfil.biografia}</Text> : null}
          </View>

          <FeedGrid
            publicaciones={publicaciones}
            userId={userId}
            cargando={false}
            cargandoMas={cargandoMas}
            hayMas={hayMas}
            refrescando={false}
            onCargarMas={cargarMas}
            onRefrescar={cargar}
            onPressTarjeta={abrirDetalle}
            onVerPerfil={onVerPerfil}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.white },
  centrado:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  topBarTitulo:{ fontSize: 16, fontWeight: '700', color: C.ink },
  header:      { alignItems: 'center', paddingTop: 16, paddingBottom: 16, paddingHorizontal: 24, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 4 },
  avatar:      { width: 84, height: 84, borderRadius: 42, marginBottom: 8 },
  avatarPH:    { alignItems: 'center', justifyContent: 'center', backgroundColor: C.earthLight },
  avatarLetra: { fontSize: 30, fontWeight: '700', color: C.earth },
  username:    { fontSize: 16, fontWeight: '700', color: C.ink },
  nombre:      { fontSize: 13, color: C.muted },
  bio:         { fontSize: 13, color: C.ink, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 8 },
});
