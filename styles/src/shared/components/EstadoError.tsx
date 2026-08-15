// src/shared/components/EstadoError.tsx
//
// Banner de error no bloqueante con reintento opcional — mismo patrón
// que ya usaba PFeed.tsx (banner en vez de Alert.alert), consolidado
// acá para adoptarlo también en pantallas que hoy solo muestran un
// Alert sin dejar rastro visible ni forma de reintentar.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../theme';

interface Props {
  mensaje: string;
  onReintentar?: () => void;
}

export default function EstadoError({ mensaje, onReintentar }: Props) {
  return (
    <View style={s.banner}>
      <Text style={s.texto}>{mensaje}</Text>
      {onReintentar && (
        <TouchableOpacity onPress={onReintentar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.reintentar}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  banner: { backgroundColor: C.errorLight, marginHorizontal: 16, marginTop: 8, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  texto: { flex: 1, fontSize: 13, color: C.error, textAlign: 'center' },
  reintentar: { fontSize: 13, color: C.error, fontWeight: '700', textDecorationLine: 'underline' },
});
