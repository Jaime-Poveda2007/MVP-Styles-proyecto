// src/features/reseñas/components/EstrellasSelector.tsx
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { C } from '../../../shared/theme';

interface Props {
  valor: number;
  onCambiar?: (valor: number) => void;
  size?: number;
  soloLectura?: boolean;
}

export default function EstrellasSelector({ valor, onCambiar, size = 28, soloLectura = false }: Props) {
  return (
    <View style={s.fila}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={soloLectura} onPress={() => onCambiar?.(n)} hitSlop={6}>
          <Star size={size} color={C.earth} fill={n <= valor ? C.earth : 'transparent'} strokeWidth={1.8} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 4 },
});
