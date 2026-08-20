// src/features/marcas/screens/PPerfilPublicoMarca.tsx
//
// Perfil público de una marca: header (logo, nombre, categoría, bio) +
// 3 pestañas independientes (Publicaciones/Reposts/Catálogo), cada una
// con su propia carga de datos — misma estructura visual que
// PPerfilPublico.tsx (perfil de usuario) para el header, extendida con
// el selector de pestañas de SelectorPestañasPerfil.tsx.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import ImagenConCarga from '../../../shared/components/ImagenConCarga';
import PDetalle from '../../feed/PDetalle';
import { Publicacion } from '../../feed/types';
import { obtenerPublicacionPorId } from '../../feed/services/publicacionesService';
import { obtenerPerfilPublicoDeMarca, PerfilMarcaPublico } from '../marcas.api';
import PReseñasPrenda from '../../reseñas/screens/PReseñasPrenda';
import SelectorPestañasPerfil, { PestañaPerfilMarca } from '../perfil/components/SelectorPestañasPerfil';
import TabPublicacionesMarca from '../perfil/components/TabPublicacionesMarca';
import TabRepostsMarca from '../perfil/components/TabRepostsMarca';
import TabCatalogoMarca from '../perfil/components/TabCatalogoMarca';
import EstadoError from '../../../shared/components/EstadoError';
import { useTheme } from '../../../shared/ThemeContext';

interface Props {
  targetMarcaId: string;
  userId: string;
  esDeMarca?: boolean;
  onVolver: () => void;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
}

export default function PPerfilPublicoMarca({
  targetMarcaId, userId, esDeMarca = false, onVolver, onVerPerfil,
}: Props) {
  const { C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    safe:        { flex: 1, backgroundColor: C.white },
    centrado:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
    backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
    topBarTitulo:{ flex: 1, fontSize: 16, fontWeight: '700', color: C.ink, textAlign: 'center', marginHorizontal: 8 },
    header:      { alignItems: 'center', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 24, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 4 },
    logo:        { width: 84, height: 84, borderRadius: 20, marginBottom: 8 },
    logoPH:      { alignItems: 'center', justifyContent: 'center', backgroundColor: C.earthLight },
    logoLetra:   { fontSize: 30, fontWeight: '700', color: C.earth },
    nombre:      { fontSize: 16, fontWeight: '700', color: C.ink },
    categoriaChip:{ backgroundColor: C.earthLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
    categoriaTexto:{ fontSize: 11, fontWeight: '600', color: C.earthDark },
    bio:         { fontSize: 13, color: C.ink, textAlign: 'center', marginTop: 8, lineHeight: 18, paddingHorizontal: 8 },
    tabBody:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    oculto:      { display: 'none' },
  }), [C]);
  const [perfil, setPerfil] = useState<PerfilMarcaPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PestañaPerfilMarca>('publicaciones');
  const [detalle, setDetalle] = useState<Publicacion | null>(null);
  const [reseñaPrendaSel, setReseñaPrendaSel] = useState<{
    prendaId: string; nombre: string;
  } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPerfil(await obtenerPerfilPublicoDeMarca(targetMarcaId));
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar este perfil.');
    } finally {
      setCargando(false);
    }
  }, [targetMarcaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirDetalle = async (item: Publicacion) => {
    try {
      setDetalle(await obtenerPublicacionPorId(item.id, userId, esDeMarca));
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
        esDeMarca={esDeMarca}
        onVolver={() => setDetalle(null)}
        onEliminado={() => setDetalle(null)}
        onVerPerfil={onVerPerfil}
      />
    );
  }

  if (reseñaPrendaSel) {
    return (
      <PReseñasPrenda
        prendaId={reseñaPrendaSel.prendaId}
        nombrePrenda={reseñaPrendaSel.nombre}
        marcaNombre={perfil?.nombre ?? null}
        usuarioId={userId}
        esDeMarca={esDeMarca}
        onVolver={() => setReseñaPrendaSel(null)}
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
          <EstadoError mensaje={error ?? 'No se pudo cargar este perfil.'} onReintentar={cargar} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={onVolver}>
          <ChevronLeft size={22} color={C.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.topBarTitulo} numberOfLines={1}>{perfil.nombre}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.header}>
        {perfil.logo_url
          ? <ImagenConCarga uri={perfil.logo_url} style={s.logo} />
          : <View style={[s.logo, s.logoPH]}><Text style={s.logoLetra}>{perfil.nombre[0]?.toUpperCase() ?? '?'}</Text></View>
        }
        <Text style={s.nombre}>{perfil.nombre}</Text>
        <View style={s.categoriaChip}><Text style={s.categoriaTexto}>{perfil.categoria}</Text></View>
        {perfil.descripcion ? <Text style={s.bio}>{perfil.descripcion}</Text> : null}
      </View>

      <SelectorPestañasPerfil activa={tab} onCambiar={setTab} />

      <View style={{ flex: 1 }}>
        <View style={[s.tabBody, tab !== 'publicaciones' && s.oculto]}>
          <TabPublicacionesMarca
            marcaId={targetMarcaId}
            userId={userId}
            esDeMarca={esDeMarca}
            onVerPerfil={onVerPerfil}
            onAbrirDetalle={abrirDetalle}
          />
        </View>
        <View style={[s.tabBody, tab !== 'reposts' && s.oculto]}>
          <TabRepostsMarca
            marcaId={targetMarcaId}
            esPropio={false}
            onAbrirDetalle={abrirDetalle}
          />
        </View>
        <View style={[s.tabBody, tab !== 'catalogo' && s.oculto]}>
          <TabCatalogoMarca
            marcaId={targetMarcaId}
            userId={userId}
            onVerReseñas={(prendaId, nombre) => setReseñaPrendaSel({ prendaId, nombre })}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
