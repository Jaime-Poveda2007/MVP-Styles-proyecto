// src/features/marcas/catalogo/screens/PCatalogo.tsx
//
// RF-M02/RF-M03: panel de catálogo de la marca. Lista todas las
// prendas (activas e inactivas), permite crear, editar, desactivar y
// reactivar, y muestra el contador contra el límite de 200 activas.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Plus, ImagePlus, BarChart3 } from 'lucide-react-native';
import { C, R } from '../../../../shared/theme';
import { Prenda } from '../types';
import {
  obtenerMarcaId, listarPrendasDeLaMarca, contarPrendasActivas,
  desactivarPrenda, reactivarPrenda, LIMITE_PRENDAS_ACTIVAS,
} from '../services/prendasService';

interface Props {
  onCrear: () => void;
  onEditar: (prenda: Prenda) => void;
  onCrearPublicacion: () => void;
  onVerMetricas: () => void;
  onCerrarSesion: () => void;
}

export default function PCatalogo({ onCrear, onEditar, onCrearPublicacion, onVerMetricas, onCerrarSesion }: Props) {
  const [marcaId, setMarcaId] = useState<string | null>(null);
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [activas, setActivas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const id = await obtenerMarcaId();
      setMarcaId(id);
      const [lista, conteo] = await Promise.all([
        listarPrendasDeLaMarca(id),
        contarPrendasActivas(id),
      ]);
      setPrendas(lista);
      setActivas(conteo);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar el catálogo.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const onRefresh = () => { setRefrescando(true); cargar(); };

  const alternarActiva = async (prenda: Prenda) => {
    if (!marcaId) return;
    setCambiandoId(prenda.id);
    try {
      if (prenda.activa) {
        await desactivarPrenda(prenda.id);
      } else {
        await reactivarPrenda(prenda.id, marcaId);
      }
      await cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar la prenda.');
    } finally {
      setCambiandoId(null);
    }
  };

  if (cargando) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centrado}><ActivityIndicator color={C.earth} /></View>
      </SafeAreaView>
    );
  }

  const alcanzoLimite = activas >= LIMITE_PRENDAS_ACTIVAS;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>Panel de marca</Text>
          <Text style={s.titulo}>Catálogo</Text>
        </View>
        <View style={s.headerAcciones}>
          <TouchableOpacity style={s.publicarBtn} onPress={onCrearPublicacion}>
            <ImagePlus size={16} color="#fff" strokeWidth={2} />
            <Text style={s.publicarBtnText}>Publicar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={onVerMetricas}>
            <BarChart3 size={20} color={C.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={onCerrarSesion}>
            <LogOut size={20} color={C.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.contadorWrap}>
        <Text style={[s.contadorTexto, alcanzoLimite && s.contadorTextoLimite]}>
          {activas}/{LIMITE_PRENDAS_ACTIVAS} prendas activas
        </Text>
      </View>

      <FlatList
        data={prendas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.lista}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={C.earth} />}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Text style={s.vacioTexto}>Aún no has agregado prendas a tu catálogo.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={() => onEditar(item)}>
            {item.imagen_url
              ? <Image source={{ uri: item.imagen_url }} style={s.imagen} />
              : <View style={[s.imagen, s.imagenPlaceholder]}><Text style={{ color: C.muted, fontSize: 11 }}>Sin imagen</Text></View>
            }
            <View style={s.info}>
              <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>
              <Text style={s.categoria}>{item.categoria}</Text>
              <Text style={s.precio}>${item.precio.toLocaleString('es-CO')}</Text>
            </View>
            <View style={s.switchWrap}>
              {cambiandoId === item.id
                ? <ActivityIndicator size="small" color={C.earth} />
                : (
                  <Switch
                    value={item.activa}
                    onValueChange={() => alternarActiva(item)}
                    trackColor={{ false: C.border, true: C.earthLight }}
                    thumbColor={item.activa ? C.earth : '#fff'}
                  />
                )
              }
              <Text style={s.switchLabel}>{item.activa ? 'Activa' : 'Inactiva'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={[s.fab, alcanzoLimite && s.fabDisabled]}
        onPress={() => {
          if (alcanzoLimite) {
            Alert.alert('Límite alcanzado', `Ya tienes ${LIMITE_PRENDAS_ACTIVAS} prendas activas. Desactiva alguna para agregar otra.`);
            return;
          }
          onCrear();
        }}
        activeOpacity={0.85}
      >
        <Plus size={22} color="#fff" />
        <Text style={s.fabText}>Nueva prenda</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.surface },
  centrado:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  eyebrow:      { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 4 },
  titulo:       { fontSize: 24, fontWeight: '700', color: C.ink },
  headerAcciones: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  publicarBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.earth, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 },
  publicarBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  logoutBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  contadorWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  contadorTexto:{ fontSize: 13, color: C.muted, fontWeight: '500' },
  contadorTextoLimite: { color: C.error, fontWeight: '700' },
  lista:        { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  vacio:        { paddingTop: 60, alignItems: 'center' },
  vacioTexto:   { color: C.muted, fontSize: 14, textAlign: 'center' },
  card:         { flexDirection: 'row', backgroundColor: C.white, borderRadius: R.card, padding: 10, gap: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  imagen:       { width: 64, height: 64, borderRadius: R.input, backgroundColor: C.earthLight },
  imagenPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info:         { flex: 1, gap: 2 },
  nombre:       { fontSize: 15, fontWeight: '600', color: C.ink },
  categoria:    { fontSize: 12, color: C.muted },
  precio:       { fontSize: 14, fontWeight: '700', color: C.earth, marginTop: 2 },
  switchWrap:   { alignItems: 'center', gap: 2 },
  switchLabel:  { fontSize: 10, color: C.muted },
  fab:          { position: 'absolute', bottom: 24, right: 20, left: 20, backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  fabDisabled:  { opacity: 0.6 },
  fabText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});
