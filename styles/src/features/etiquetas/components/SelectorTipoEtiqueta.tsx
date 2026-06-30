// src/features/etiquetas/components/SelectorTipoEtiqueta.tsx
import React, { useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Search, PenLine, ChevronLeft, X, Tag, Check } from 'lucide-react-native';
import BuscadorPrendas from './BuscadorPrendas';
import SelectorEstilo from './SelectorEstilo';
import { useEstilos } from '../hooks/useEstilos';

interface Props {
  onCerrar: () => void;
  onSeleccionarCatalogo: (prendaId: string, prendaNombre: string, estiloId: string | null) => void;
  onSeleccionarManual: (
    nombreManual: string,
    marcaManual?: string,
    precioManual?: number,
    estiloId?: string | null
  ) => void;
}

type Modo = 'elegir' | 'catalogo' | 'manual';

export default function SelectorTipoEtiqueta({
  onCerrar, onSeleccionarCatalogo, onSeleccionarManual,
}: Props) {
  const [modo, setModo] = useState<Modo>('elegir');
  const [nombreManual, setNombreManual] = useState('');
  const [marcaManual, setMarcaManual] = useState('');
  const [precioManual, setPrecioManual] = useState('');
  const [estiloId, setEstiloId] = useState<string | null>(null);

  const { estilos, loading: loadingEstilos } = useEstilos();

  const nombreValido = nombreManual.trim().length > 0;

  function enviarManual() {
    if (!nombreValido) return;
    const precio = precioManual ? Number(precioManual) : undefined;
    onSeleccionarManual(nombreManual.trim(), marcaManual.trim() || undefined, precio, estiloId);
  }

  return (
    <View>
      <Pressable onPress={onCerrar}>
        <Text>Cancelar</Text>
      </Pressable>

      {modo === 'elegir' && (
        <View>
          <Text>¿Qué tipo de etiqueta quieres agregar?</Text>
          <Pressable onPress={() => setModo('catalogo')}>
            <Text>Buscar en catálogo</Text>
          </Pressable>
          <Pressable onPress={() => setModo('manual')}>
            <Text>Agregar prenda manual</Text>
          </Pressable>
        </View>
      )}

      {modo === 'catalogo' && (
        <View>
          <BuscadorPrendas
            onSeleccionar={(prenda) =>
              onSeleccionarCatalogo(prenda.id, prenda.nombre, estiloId)
            }
          />
          <SelectorEstilo
            estilos={estilos}
            loading={loadingEstilos}
            seleccionado={estiloId}
            onSeleccionar={setEstiloId}
          />
          <Pressable onPress={() => setModo('elegir')}>
            <Text>Volver</Text>
          </Pressable>
        </View>
      )}

      {modo === 'manual' && (
        <View>
          <Text>Nombre de la prenda</Text>
          <TextInput
            value={nombreManual}
            onChangeText={setNombreManual}
            placeholder="Ej: Chaqueta de cuero"
          />

          <Text>Marca (opcional)</Text>
          <TextInput
            value={marcaManual}
            onChangeText={setMarcaManual}
            placeholder="Ej: Zara"
          />

          <Text>Precio (opcional)</Text>
          <TextInput
            value={precioManual}
            onChangeText={setPrecioManual}
            placeholder="Ej: 120000"
            keyboardType="numeric"
          />

          <SelectorEstilo
            estilos={estilos}
            loading={loadingEstilos}
            seleccionado={estiloId}
            onSeleccionar={setEstiloId}
          />

          <Pressable onPress={enviarManual}>
            <Text>Confirmar etiqueta manual</Text>
          </Pressable>
          <Pressable onPress={() => setModo('elegir')}>
            <Text>Volver</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:            { flex: 1, backgroundColor: 'rgba(26,22,20,0.5)' },
  sheetWrap:           { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet:               { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxHeight: 560 },
  handle:              { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerBtn:           { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerTitle:         { fontSize: 16, fontWeight: '700', color: C.ink },
  opciones:            { gap: 10 },
  opcionCard:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: R.card, padding: 14, borderWidth: 1, borderColor: C.border },
  opcionIcono:         { width: 40, height: 40, borderRadius: 12, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  opcionTitulo:        { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 2 },
  opcionSub:           { fontSize: 12, color: C.muted, lineHeight: 16 },
  catalogoWrap:        { minHeight: 280 },
  form:                { gap: 14 },
  campo:               { gap: 6 },
  label:               { fontSize: 13, fontWeight: '500', color: C.muted },
  opcional:            { fontWeight: '400', color: C.border },
  input:               { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.ink },
  inputPrecioWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingLeft: 14 },
  simbolo:             { fontSize: 14, color: C.muted, fontWeight: '600' },
  inputPrecio:         { flex: 1, paddingHorizontal: 8, paddingVertical: 12, fontSize: 14, color: C.ink },
  confirmarBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 14, marginTop: 4 },
  confirmarBtnDisabled:{ opacity: 0.4 },
  confirmarText:       { fontSize: 15, fontWeight: '700', color: '#fff' },
});