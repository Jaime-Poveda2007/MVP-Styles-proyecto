// src/shared/components/EstadoVacio.tsx
//
// Estado vacío reutilizable (icono + texto centrados). Antes cada
// pantalla con listas (PMisReposts, PCatalogo, PMetricasMarca,
// TabsResultados, ListaReseñas) reimplementaba su propio View+Text
// para esto con el mismo layout — se consolida acá.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../theme';

interface Props {
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  texto: string;
}

export default function EstadoVacio({ icon: Icon, texto }: Props) {
  return (
    <View style={s.centro}>
      {Icon && <Icon size={22} color={C.muted} strokeWidth={2} />}
      <Text style={s.texto}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 32 },
  texto: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
});
