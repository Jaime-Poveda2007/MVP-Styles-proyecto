// src/features/busqueda/components/ResultadoMarcaRow.tsx
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { ResultadoMarca } from '../busqueda.types';
import { C } from '../../../shared/theme';

interface Props {
  item: ResultadoMarca;
  onPress: () => void;
}

export default function ResultadoMarcaRow({ item, onPress }: Props) {
  return (
    <Pressable style={s.fila} onPress={onPress}>
      {item.logo_url ? (
        <Image source={{ uri: item.logo_url }} style={s.logo} />
      ) : (
        <View style={s.logoPH}>
          <Text style={s.logoLetra}>{item.nombre[0]?.toUpperCase() ?? '?'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>
        <Text style={s.categoria}>{item.categoria}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
  logo: { width: 44, height: 44, borderRadius: 10 },
  logoPH: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  logoLetra: { fontSize: 16, fontWeight: '700', color: C.earth },
  nombre: { fontSize: 14, fontWeight: '700', color: C.ink },
  categoria: { fontSize: 12, color: C.muted, marginTop: 1 },
});