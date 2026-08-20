// src/features/reseñas/components/ResumenValoracion.tsx
//
// Pieza chiquita y reutilizable: estrellas de solo lectura + promedio
// + "(N)" + botón "Ver reseñas". Va en dos lugares de PDetalle.tsx:
//   1) El popup que aparece al tocar el pin de una etiqueta.
//   2) Cada fila de la sección "Prendas en este look".
// Usa usePromedioPrenda (liviano) porque puede haber varias instancias
// de este componente montadas a la vez en la misma pantalla.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';
import { usePromedioPrenda } from '../usePromedioPrenda';
import { useTheme } from '../../../shared/ThemeContext';

interface Props {
  prendaId: string;
  onVerReseñas: () => void;
  /** 'claro' para fondos oscuros (popup del pin), 'oscuro' para fondos claros (lista) */
  variante?: 'claro' | 'oscuro';
}

export default function ResumenValoracion({ prendaId, onVerReseñas, variante = 'oscuro' }: Props) {
  const { C } = useTheme();
  const { promedio, total, cargando } = usePromedioPrenda(prendaId);
  const esClaro = variante === 'claro';

  // La variante "claro" solo se usa sobre el popup de PDetalle.tsx, que
  // tiene fondo oscuro fijo (rgba(26,22,20,0.92)) sin importar el tema
  // — por eso acá el blanco es literal y no el token C.white (que en
  // modo oscuro pasa a significar "casi negro" y quedaría invisible).
  const s = useMemo(() => StyleSheet.create({
    fila:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    texto:      { fontSize: 12, color: C.muted, fontWeight: '600' },
    textoClaro: { color: '#FFFFFF' },
  }), [C]);

  if (cargando) return null;

  return (
    <TouchableOpacity style={s.fila} onPress={onVerReseñas} activeOpacity={0.7}>
      <Star size={12} color={esClaro ? '#FFFFFF' : C.earth} fill={esClaro ? '#FFFFFF' : C.earth} strokeWidth={0} />
      <Text style={[s.texto, esClaro && s.textoClaro]}>
        {promedio != null ? promedio.toFixed(1) : 'Sin reseñas'}{total > 0 ? ` (${total})` : ''}
      </Text>
      <ChevronRight size={13} color={esClaro ? 'rgba(255,255,255,0.7)' : C.muted} strokeWidth={2} />
    </TouchableOpacity>
  );
}
