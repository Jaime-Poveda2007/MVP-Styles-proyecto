// src/features/marcas/publicaciones/SelectorPrendaPropia.tsx
//
// RF-M04: "Etiquetado de prendas propias del catálogo". A diferencia
// de SelectorTipoEtiqueta (usuario), este selector NO busca en el
// catálogo de todas las marcas ni ofrece etiqueta manual: solo lista
// las prendas ACTIVAS de la propia marca. Implementa la misma forma
// (onCerrar / onSeleccionarCatalogo / onSeleccionarManual) que espera
// EtiquetadoImagen.tsx para poder inyectarse como su prop `Selector`.

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Image, Pressable,
  FlatList, ActivityIndicator, StyleSheet, Modal,
} from 'react-native';
import { X, Search } from 'lucide-react-native';
import { C, R } from '../../../shared/theme';
import { Prenda } from '../catalogo/types';
import { obtenerMarcaId, listarPrendasDeLaMarca } from '../catalogo/services/prendasService';

interface Props {
  onCerrar: () => void;
  onSeleccionarCatalogo: (prendaId: string, prendaNombre: string, estiloId: string | null) => void;
  // Requerido por la forma que espera EtiquetadoImagen, pero el panel
  // de marca no ofrece etiqueta manual (solo catálogo propio), así que
  // nunca se invoca.
  onSeleccionarManual: (nombreManual: string, marcaManual?: string, precioManual?: number, estiloId?: string | null) => void;
}

export default function SelectorPrendaPropia({ onCerrar, onSeleccionarCatalogo }: Props) {
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const marcaId = await obtenerMarcaId();
        const todas = await listarPrendasDeLaMarca(marcaId);
        setPrendas(todas.filter(p => p.activa));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const filtradas = prendas.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onCerrar} />
      <View style={s.sheetWrap}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <Text style={s.headerTitle}>Etiquetar prenda propia</Text>
            <Pressable style={s.closeBtn} onPress={onCerrar}>
              <X size={20} color={C.muted} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={s.buscadorWrap}>
            <Search size={16} color={C.muted} strokeWidth={2} />
            <TextInput
              style={s.buscadorInput}
              placeholder="Buscar en tu catálogo..."
              placeholderTextColor={C.muted}
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
            />
          </View>

          {cargando ? (
            <ActivityIndicator color={C.earth} style={{ marginTop: 24 }} />
          ) : prendas.length === 0 ? (
            <Text style={s.vacioTexto}>
              Todavía no tienes prendas activas en tu catálogo. Agrega una desde "Nueva prenda" antes de etiquetarla aquí.
            </Text>
          ) : (
            <FlatList
              data={filtradas}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 340 }}
              ListEmptyComponent={<Text style={s.vacioTexto}>Sin resultados para "{busqueda}".</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={s.fila}
                  onPress={() => onSeleccionarCatalogo(item.id, item.nombre, null)}
                >
                  {item.imagen_url
                    ? <Image source={{ uri: item.imagen_url }} style={s.thumb} />
                    : <View style={[s.thumb, s.thumbPlaceholder]} />
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={s.filaNombre} numberOfLines={1}>{item.nombre}</Text>
                    <Text style={s.filaPrecio}>${item.precio.toLocaleString('es-CO')}</Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(26,22,20,0.5)' },
  sheetWrap:     { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet:         { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxHeight: 520 },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: C.ink },
  closeBtn:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buscadorWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  buscadorInput: { flex: 1, fontSize: 14, color: C.ink, padding: 0 },
  vacioTexto:    { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 24, lineHeight: 19 },
  fila:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
  thumb:         { width: 44, height: 44, borderRadius: R.input, backgroundColor: C.earthLight },
  thumbPlaceholder: {},
  filaNombre:    { fontSize: 14, fontWeight: '600', color: C.ink },
  filaPrecio:    { fontSize: 13, color: C.earth, fontWeight: '600', marginTop: 2 },
});
