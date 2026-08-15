// src/features/reseñas/components/ResumenValoracion.tsx
//
// Pieza chiquita y reutilizable: estrellas de solo lectura + promedio
// + "(N)" + botón "Ver reseñas". Va en dos lugares de PDetalle.tsx:
//   1) El popup que aparece al tocar el pin de una etiqueta.
//   2) Cada fila de la sección "Prendas en este look".
// Usa usePromedioPrenda (liviano) porque puede haber varias instancias
// de este componente montadas a la vez en la misma pantalla.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';
import { usePromedioPrenda } from '../usePromedioPrenda';
import { C } from '../../../shared/theme';

interface Props {
  prendaId: string;
  onVerReseñas: () => void;
  /** 'claro' para fondos oscuros (popup del pin), 'oscuro' para fondos claros (lista) */
  variante?: 'claro' | 'oscuro';
}

export default function ResumenValoracion({ prendaId, onVerReseñas, variante = 'oscuro' }: Props) {
  const { promedio, total, cargando } = usePromedioPrenda(prendaId);
  const esClaro = variante === 'claro';

  if (cargando) return null;

  return (
    <TouchableOpacity style={s.fila} onPress={onVerReseñas} activeOpacity={0.7}>
      <Star size={12} color={esClaro ? C.white : C.earth} fill={esClaro ? C.white : C.earth} strokeWidth={0} />
      <Text style={[s.texto, esClaro && s.textoClaro]}>
        {promedio != null ? promedio.toFixed(1) : 'Sin reseñas'}{total > 0 ? ` (${total})` : ''}
      </Text>
      <ChevronRight size={13} color={esClaro ? 'rgba(255,255,255,0.7)' : C.muted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fila:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  texto:      { fontSize: 12, color: C.muted, fontWeight: '600' },
  textoClaro: { color: C.white },
});
