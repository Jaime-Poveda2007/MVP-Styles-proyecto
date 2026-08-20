// src/features/marcas/screens/PPerfilMarca.tsx
//
// Perfil propio de la marca (editable) — mismo layout que
// PPerfilPublicoMarca.tsx (header + pestañas), pero sin botón "volver"
// (se llega por tab, igual que PPerfil.tsx de usuario) y con un botón
// "Editar perfil". La pestaña Reposts se monta con esPropio para
// mostrar el botón de deshacer.
import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Settings } from 'lucide-react-native';
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
import { C } from '../../../shared/theme';

interface Props {
  marcaId: string;
  onEditarPerfil: () => void;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
}

export default function PPerfilMarca({ marcaId, onEditarPerfil, onVerPerfil }: Props) {
  const [perfil, setPerfil] = useState<PerfilMarcaPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PestañaPerfilMarca>('publicaciones');
  const [detalle, setDetalle] = useState<Publicacion | null>(null);
  const [reseñaPrendaSel, setReseñaPrendaSel] = useState<{
    prendaId: string; nombre: string;
  } | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setPerfil(await obtenerPerfilPublicoDeMarca(marcaId));
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar tu perfil.');
    } finally {
      setCargando(false);
    }
  }, [marcaId]);

  // Refresca el header cada vez que la pantalla recupera foco (por
  // ejemplo al volver de "Editar perfil"), para no depender de un
  // pull-to-refresh manual.
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const abrirDetalle = async (item: Publicacion) => {
    try {
      setDetalle(await obtenerPublicacionPorId(item.id, marcaId, true));
    } catch (e) {
      console.warn('No se pudo refrescar la publicación antes de abrirla:', e);
      setDetalle(item);
    }
  };

  if (detalle) {
    return (
      <PDetalle
        publicacion={detalle}
        userId={marcaId}
        esDeMarca
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
        usuarioId={marcaId}
        esDeMarca
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
          <EstadoError mensaje={error ?? 'No se pudo cargar tu perfil.'} onReintentar={cargar} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        {perfil.logo_url
          ? <ImagenConCarga uri={perfil.logo_url} style={s.logo} />
          : <View style={[s.logo, s.logoPH]}><Text style={s.logoLetra}>{perfil.nombre[0]?.toUpperCase() ?? '?'}</Text></View>
        }
        <Text style={s.nombre}>{perfil.nombre}</Text>
        <View style={s.categoriaChip}><Text style={s.categoriaTexto}>{perfil.categoria}</Text></View>
        {perfil.descripcion ? <Text style={s.bio}>{perfil.descripcion}</Text> : null}

        <TouchableOpacity style={s.botonSecundario} onPress={onEditarPerfil}>
          <Settings size={14} color={C.ink} strokeWidth={2} />
          <Text style={s.botonSecundarioTexto}>Editar perfil</Text>
        </TouchableOpacity>
      </View>

      <SelectorPestañasPerfil activa={tab} onCambiar={setTab} />

      <View style={{ flex: 1 }}>
        <View style={[s.tabBody, tab !== 'publicaciones' && s.oculto]}>
          <TabPublicacionesMarca
            marcaId={marcaId}
            userId={marcaId}
            esDeMarca
            onVerPerfil={onVerPerfil}
            onAbrirDetalle={abrirDetalle}
          />
        </View>
        <View style={[s.tabBody, tab !== 'reposts' && s.oculto]}>
          <TabRepostsMarca
            marcaId={marcaId}
            esPropio
            onAbrirDetalle={abrirDetalle}
          />
        </View>
        <View style={[s.tabBody, tab !== 'catalogo' && s.oculto]}>
          <TabCatalogoMarca
            marcaId={marcaId}
            userId={marcaId}
            onVerReseñas={(prendaId, nombre) => setReseñaPrendaSel({ prendaId, nombre })}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.white },
  centrado:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { alignItems: 'center', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 24, borderBottomWidth: 0.5, borderBottomColor: C.border, gap: 4 },
  logo:        { width: 84, height: 84, borderRadius: 20, marginBottom: 8 },
  logoPH:      { alignItems: 'center', justifyContent: 'center', backgroundColor: C.earthLight },
  logoLetra:   { fontSize: 30, fontWeight: '700', color: C.earth },
  nombre:      { fontSize: 16, fontWeight: '700', color: C.ink },
  categoriaChip:{ backgroundColor: C.earthLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  categoriaTexto:{ fontSize: 11, fontWeight: '600', color: C.earthDark },
  bio:         { fontSize: 13, color: C.ink, textAlign: 'center', marginTop: 8, lineHeight: 18, paddingHorizontal: 8 },
  botonSecundario: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12 },
  botonSecundarioTexto: { fontSize: 12, color: C.ink, fontWeight: '600' },
  tabBody:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  oculto:      { display: 'none' },
});
