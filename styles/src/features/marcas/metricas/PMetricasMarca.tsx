// src/features/marcas/metricas/PMetricasMarca.tsx
//
// RF-M05: panel de métricas de marca — solo lectura. Sin librería de
// gráficas ni date-picker: el requisito son conteos (no tendencias) y
// el filtro es un toggle binario semana/mes, así que tarjetas
// numéricas + una lista por prenda son suficientes para el MVP.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Tag, ExternalLink } from 'lucide-react-native';
import ImagenConCarga from '../../../shared/components/ImagenConCarga';
import EstadoVacio from '../../../shared/components/EstadoVacio';
import EstadoError from '../../../shared/components/EstadoError';
import { C, R } from '../../../shared/theme';
import {
  obtenerMetricasPorPrenda, obtenerTotalesPublicaciones,
  MetricaPrenda, TotalesMarca, RangoMetricas,
} from './metricasService';

interface Props {
  marcaId: string;
  onVolver: () => void;
}

export default function PMetricasMarca({ marcaId, onVolver }: Props) {
  const [rango, setRango] = useState<RangoMetricas>('semana');
  const [metricas, setMetricas] = useState<MetricaPrenda[]>([]);
  const [totales, setTotales] = useState<TotalesMarca>({ likes: 0, reposts: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [porPrenda, totalesMarca] = await Promise.all([
        obtenerMetricasPorPrenda(marcaId, rango),
        obtenerTotalesPublicaciones(marcaId, rango),
      ]);
      setMetricas(porPrenda);
      setTotales(totalesMarca);
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar las métricas.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [marcaId, rango]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  const onRefresh = () => { setRefrescando(true); cargar(); };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onVolver}>
          <ChevronLeft size={22} color={C.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View>
          <Text style={s.eyebrow}>Panel de marca</Text>
          <Text style={s.titulo}>Métricas</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.toggleFila}>
        {(['semana', 'mes'] as RangoMetricas[]).map(opcion => {
          const activo = rango === opcion;
          return (
            <TouchableOpacity
              key={opcion}
              style={[s.toggleChip, activo && s.toggleChipActivo]}
              onPress={() => setRango(opcion)}
            >
              <Text style={[s.toggleTexto, activo && s.toggleTextoActivo]}>
                {opcion === 'semana' ? 'Última semana' : 'Último mes'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && !cargando && <EstadoError mensaje={error} onReintentar={cargar} />}

      {cargando ? (
        <View style={s.centrado}><ActivityIndicator color={C.earth} /></View>
      ) : (
        <FlatList
          data={metricas}
          keyExtractor={(item) => item.prenda.id}
          contentContainerStyle={s.lista}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={C.earth} />}
          ListHeaderComponent={
            <View style={s.totalesFila}>
              <View style={s.totalCard}>
                <Text style={s.totalNumero}>{totales.likes}</Text>
                <Text style={s.totalLabel}>Likes totales</Text>
              </View>
              <View style={s.totalCard}>
                <Text style={s.totalNumero}>{totales.reposts}</Text>
                <Text style={s.totalLabel}>Reposts totales</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            error ? null : (
              <EstadoVacio texto="Aún no tienes prendas en tu catálogo." />
            )
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              {item.prenda.imagen_url
                ? <ImagenConCarga uri={item.prenda.imagen_url} style={s.imagen} />
                : <View style={[s.imagen, s.imagenPlaceholder]}><Text style={{ color: C.muted, fontSize: 11 }}>Sin imagen</Text></View>
              }
              <View style={s.info}>
                <Text style={s.nombre} numberOfLines={1}>{item.prenda.nombre}</Text>
                <Text style={s.categoria}>{item.prenda.categoria}</Text>
              </View>
              <View style={s.badges}>
                <View style={s.badge}>
                  <Tag size={11} color={C.earth} strokeWidth={2} />
                  <Text style={s.badgeTexto}>{item.etiquetados}</Text>
                </View>
                <View style={s.badge}>
                  <ExternalLink size={11} color={C.earth} strokeWidth={2} />
                  <Text style={s.badgeTexto}>{item.clics}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.surface },
  centrado:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  eyebrow:      { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: C.earth, textAlign: 'center' },
  titulo:       { fontSize: 20, fontWeight: '700', color: C.ink, textAlign: 'center' },
  toggleFila:   { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  toggleChip:   { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: R.chip, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  toggleChipActivo: { backgroundColor: C.earth, borderColor: C.earth },
  toggleTexto:  { fontSize: 13, fontWeight: '600', color: C.ink },
  toggleTextoActivo: { color: C.white },
  lista:        { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  totalesFila:  { flexDirection: 'row', gap: 12, marginBottom: 12 },
  totalCard:    { flex: 1, backgroundColor: C.white, borderRadius: R.card, borderWidth: 1, borderColor: C.border, paddingVertical: 16, alignItems: 'center', gap: 2 },
  totalNumero:  { fontSize: 24, fontWeight: '800', color: C.earth },
  totalLabel:   { fontSize: 12, color: C.muted, fontWeight: '500' },
  card:         { flexDirection: 'row', backgroundColor: C.white, borderRadius: R.card, padding: 10, gap: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  imagen:       { width: 56, height: 56, borderRadius: R.input, backgroundColor: C.earthLight },
  imagenPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info:         { flex: 1, gap: 2 },
  nombre:       { fontSize: 14, fontWeight: '600', color: C.ink },
  categoria:    { fontSize: 12, color: C.muted },
  badges:       { flexDirection: 'row', gap: 10 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.earthLight, borderRadius: R.chip, paddingHorizontal: 8, paddingVertical: 5 },
  badgeTexto:   { fontSize: 12, fontWeight: '700', color: C.earthDark },
});
