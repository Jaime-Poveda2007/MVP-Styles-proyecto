// src/features/etiquetas/components/BuscadorPrendas.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { Search, Tag } from 'lucide-react-native';
import { buscarPrendas, PrendaCatalogo } from '../etiquetas.api';
import { C, R } from '../../../shared/theme';

interface Props {
  onSeleccionar: (prenda: PrendaCatalogo) => void;
}

export default function BuscadorPrendas({ onSeleccionar }: Props) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<PrendaCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (termino.trim().length < 2) {
        setResultados([]);
        return;
      }
      setCargando(true);
      try {
        const data = await buscarPrendas(termino);
        setResultados(data);
      } catch (err) {
        console.error('Error buscando prendas:', err);
        setResultados([]);
      } finally {
        setCargando(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [termino]);

  const mostrarVacio = !cargando && termino.trim().length >= 2 && resultados.length === 0;
  const mostrarHint   = termino.trim().length < 2;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.inputWrap}>
        <Search size={16} color={C.muted} strokeWidth={2} />
        <TextInput
          style={s.input}
          value={termino}
          onChangeText={setTermino}
          placeholder="Buscar por nombre o marca..."
          placeholderTextColor={C.muted}
          autoFocus
        />
        {cargando && <ActivityIndicator size="small" color={C.earth} />}
      </View>

      {mostrarHint && (
        <Text style={s.hint}>Escribe al menos 2 caracteres para buscar</Text>
      )}

      {mostrarVacio && (
        <View style={s.vacioWrap}>
          <Text style={s.vacioTitulo}>Sin resultados</Text>
          <Text style={s.vacioSub}>Puedes agregarla como prenda manual</Text>
        </View>
      )}

      <FlatList
        data={resultados}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={s.resultRow}
            onPress={() => onSeleccionar(item)}
            android_ripple={{ color: C.earthLight }}
          >
            {item.imagen_url ? (
              <Image source={{ uri: item.imagen_url }} style={s.resultImg} />
            ) : (
              <View style={s.resultImgPH}>
                <Tag size={14} color={C.earth} strokeWidth={2} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.resultNombre} numberOfLines={1}>{item.nombre}</Text>
              <Text style={s.resultMarca} numberOfLines={1}>{item.marca_nombre}</Text>
            </View>
            <Text style={s.resultPrecio}>${item.precio.toLocaleString('es-CO')}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  inputWrap:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 14, paddingVertical: 10 },
  input:        { flex: 1, fontSize: 14, color: C.ink, paddingVertical: 2 },
  hint:         { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 16 },
  vacioWrap:    { alignItems: 'center', paddingTop: 24, gap: 4 },
  vacioTitulo:  { fontSize: 14, fontWeight: '600', color: C.ink },
  vacioSub:     { fontSize: 12, color: C.muted },
  resultRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
  resultImg:    { width: 36, height: 36, borderRadius: 8, backgroundColor: C.earthLight },
  resultImgPH:  { width: 36, height: 36, borderRadius: 8, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  resultNombre: { fontSize: 13, fontWeight: '600', color: C.ink },
  resultMarca:  { fontSize: 12, color: C.muted, marginTop: 1 },
  resultPrecio: { fontSize: 13, fontWeight: '700', color: C.earthDark },
});