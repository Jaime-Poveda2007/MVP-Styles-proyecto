import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Estilo } from '../hooks/useEstilos';

interface Props {
  estilos: Estilo[];
  loading: boolean;
  seleccionado: string | null;
  onSeleccionar: (id: string | null) => void;
}

export default function SelectorEstilo({
  estilos,
  loading,
  seleccionado,
  onSeleccionar,
}: Props) {
  if (loading) return <ActivityIndicator size="small" style={{ marginTop: 8 }} />;

  return (
    <View style={styles.contenedor}>
      <Text style={styles.label}>Estilo de la prenda</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.fila}>
          {estilos.map((estilo) => {
            const activo = seleccionado === estilo.id;
            return (
              <Pressable
                key={estilo.id}
                onPress={() => onSeleccionar(activo ? null : estilo.id)}
                style={[styles.chip, activo && styles.chipActivo]}
              >
                <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
                  {estilo.nombre}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: 12 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#111827' },
  fila: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  chipActivo: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipTexto: { fontSize: 13, color: '#374151' },
  chipTextoActivo: { color: '#ffffff', fontWeight: '500' },
});
