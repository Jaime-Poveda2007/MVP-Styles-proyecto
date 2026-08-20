// src/features/busqueda/components/ResultadoPublicacionRow.tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tag } from 'lucide-react-native';
import ImagenConCarga from '../../../shared/components/ImagenConCarga';
import { ResultadoPublicacion } from '../busqueda.types';
import { useTheme } from '../../../shared/ThemeContext';

interface Props {
  item: ResultadoPublicacion;
  onPress: () => void;
}

export default function ResultadoPublicacionRow({ item, onPress }: Props) {
  const { C, R } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    fila: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border, alignItems: 'center' },
    thumbWrap: { width: 56, height: 56, borderRadius: R.input, overflow: 'hidden', backgroundColor: C.earthLight },
    thumb: { width: '100%', height: '100%' },
    badgePrenda: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
    badgePrendaTexto: { fontSize: 12, fontWeight: '700', color: C.earthDark },
    descripcion: { fontSize: 13, color: C.ink, lineHeight: 18 },
    badgeMarca: { alignSelf: 'flex-start', backgroundColor: C.earthLight, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
    badgeMarcaTexto: { fontSize: 10, color: C.earth, fontWeight: '700' },
  }), [C, R]);

  return (
    <Pressable style={s.fila} onPress={onPress}>
      <View style={s.thumbWrap}>
        <ImagenConCarga uri={item.imagen_url} style={s.thumb} />
      </View>
      <View style={{ flex: 1 }}>
        {/* Si el match vino de una prenda etiquetada, esto es lo más
            relevante para mostrar primero — le dice al usuario "por
            esto apareció este resultado". */}
        {item.prenda_coincidente && (
          <View style={s.badgePrenda}>
            <Tag size={11} color={C.earth} strokeWidth={2.5} />
            <Text style={s.badgePrendaTexto} numberOfLines={1}>
              {item.prenda_coincidente}
            </Text>
          </View>
        )}
        <Text style={s.descripcion} numberOfLines={2}>
          {item.descripcion ?? 'Sin descripción'}
        </Text>
        {item.es_de_marca && (
          <View style={s.badgeMarca}>
            <Text style={s.badgeMarcaTexto}>Marca</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
