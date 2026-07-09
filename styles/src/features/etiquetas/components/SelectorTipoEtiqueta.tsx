// src/features/etiquetas/components/SelectorTipoEtiqueta.tsx
//
// Antes este selector obligaba a elegir entre "Buscar en catálogo" o
// "Agregar prenda manual" como dos caminos separados. Ahora es un solo
// formulario: Marca + Nombre. Mientras la persona escribe, se buscan
// coincidencias en el catálogo de todas las marcas (buscarPrendas); si
// toca una coincidencia, la etiqueta queda enlazada a esa prenda (con
// precio y link a tienda reales). Si no toca ninguna, al confirmar la
// etiqueta se guarda como texto libre con la marca y el nombre que
// escribió — que es exactamente lo que necesita el buscador de
// "prendas relacionadas" para funcionar en ambos casos por igual.
import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, TextInput, FlatList, Image,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Search, X, Tag, Check } from 'lucide-react-native';
import SelectorEstilo from './SelectorEstilo';
import { useEstilos } from '../hooks/useEstilos';
import { buscarPrendas, PrendaCatalogo } from '../etiquetas.api';
import { C, R } from '../../../shared/theme';

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

export default function SelectorTipoEtiqueta({
  onCerrar, onSeleccionarCatalogo, onSeleccionarManual,
}: Props) {
  const [marca, setMarca] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [estiloId, setEstiloId] = useState<string | null>(null);

  const [sugerencias, setSugerencias] = useState<PrendaCatalogo[]>([]);
  const [buscando, setBuscando] = useState(false);
  // Cuando se toca una sugerencia, la etiqueta queda "enlazada" a esa
  // prenda del catálogo. Si la persona sigue editando el texto después,
  // se desenlaza (vuelve a ser texto libre) para no guardar datos que
  // ya no coinciden con lo que escribió.
  const [prendaEnlazada, setPrendaEnlazada] = useState<PrendaCatalogo | null>(null);

  const { estilos, loading: loadingEstilos } = useEstilos();

  useEffect(() => {
    const termino = `${marca} ${nombre}`.trim();
    const timeout = setTimeout(async () => {
      if (termino.length < 2) {
        setSugerencias([]);
        return;
      }
      setBuscando(true);
      try {
        const data = await buscarPrendas(termino);
        setSugerencias(data);
      } catch (err) {
        console.error('Error buscando prendas relacionadas:', err);
        setSugerencias([]);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [marca, nombre]);

  function elegirSugerencia(prenda: PrendaCatalogo) {
    setPrendaEnlazada(prenda);
    setMarca(prenda.marca_nombre);
    setNombre(prenda.nombre);
    setSugerencias([]);
  }

  function editarTexto(campo: 'marca' | 'nombre', valor: string) {
    // Si ya había una prenda enlazada y la persona vuelve a escribir,
    // se desenlaza: a partir de ahí queda como texto libre otra vez.
    if (prendaEnlazada) setPrendaEnlazada(null);
    if (campo === 'marca') setMarca(valor); else setNombre(valor);
  }

  function confirmar() {
    if (prendaEnlazada) {
      onSeleccionarCatalogo(prendaEnlazada.id, prendaEnlazada.nombre, estiloId);
      return;
    }
    if (!nombre.trim()) return;
    const precioNum = precio ? Number(precio) : undefined;
    onSeleccionarManual(nombre.trim(), marca.trim() || undefined, precioNum, estiloId);
  }

  const nombreValido = nombre.trim().length > 0;
  const mostrarSugerencias = !prendaEnlazada && sugerencias.length > 0;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onCerrar} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <View style={{ width: 32 }} />
            <Text style={s.headerTitle}>Nueva etiqueta</Text>
            <Pressable style={s.headerBtn} onPress={onCerrar}>
              <X size={20} color={C.muted} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={s.form}>
            <View style={s.campo}>
              <Text style={s.label}>Marca</Text>
              <TextInput
                style={s.input}
                value={marca}
                onChangeText={(v) => editarTexto('marca', v)}
                placeholder="Ej: Nike"
                placeholderTextColor={C.muted}
                autoCapitalize="words"
              />
            </View>

            <View style={s.campo}>
              <Text style={s.label}>Nombre de la prenda</Text>
              <View style={s.inputConIcono}>
                <TextInput
                  style={s.inputFlex}
                  value={nombre}
                  onChangeText={(v) => editarTexto('nombre', v)}
                  placeholder="Ej: Buzo Rojo"
                  placeholderTextColor={C.muted}
                  autoFocus
                />
                {buscando && <ActivityIndicator size="small" color={C.earth} />}
              </View>
              <Text style={s.hint}>
                Entre más específico el nombre (tipo + color), mejor va a poder
                encontrar la gente prendas parecidas.
              </Text>
            </View>

            {/* Coincidencias del catálogo mientras escribe */}
            {mostrarSugerencias && (
              <View style={s.sugerenciasWrap}>
                <Text style={s.sugerenciasTitulo}>¿Es alguna de estas?</Text>
                <FlatList
                  data={sugerencias}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <Pressable
                      style={s.resultRow}
                      onPress={() => elegirSugerencia(item)}
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
            )}

            {/* Prenda enlazada al catálogo */}
            {prendaEnlazada && (
              <View style={s.enlazadaWrap}>
                <Search size={14} color={C.earth} strokeWidth={2} />
                <Text style={s.enlazadaTexto}>
                  Enlazada al catálogo — precio y link de tienda incluidos
                </Text>
              </View>
            )}

            {/* Precio solo aplica a texto libre; si está enlazada, viene del catálogo */}
            {!prendaEnlazada && (
              <View style={s.campo}>
                <Text style={s.label}>Precio <Text style={s.opcional}>(opcional)</Text></Text>
                <View style={s.inputPrecioWrap}>
                  <Text style={s.simbolo}>$</Text>
                  <TextInput
                    style={s.inputPrecio}
                    value={precio}
                    onChangeText={setPrecio}
                    placeholder="120.000"
                    placeholderTextColor={C.muted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            <SelectorEstilo
              estilos={estilos}
              loading={loadingEstilos}
              seleccionado={estiloId}
              onSeleccionar={setEstiloId}
            />

            <Pressable
              style={[s.confirmarBtn, !nombreValido && s.confirmarBtnDisabled]}
              onPress={confirmar}
              disabled={!nombreValido}
            >
              <Check size={16} color="#fff" strokeWidth={2.5} />
              <Text style={s.confirmarText}>Confirmar etiqueta</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:            { flex: 1, backgroundColor: 'rgba(26,22,20,0.5)' },
  sheetWrap:           { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet:               { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, maxHeight: 620 },
  handle:              { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerBtn:           { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerTitle:         { fontSize: 16, fontWeight: '700', color: C.ink },
  form:                { gap: 14 },
  campo:               { gap: 6 },
  label:               { fontSize: 13, fontWeight: '500', color: C.muted },
  opcional:            { fontWeight: '400', color: C.border },
  hint:                { fontSize: 11, color: C.muted, lineHeight: 15 },
  input:               { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.ink },
  inputConIcono:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 14, paddingVertical: 4 },
  inputFlex:           { flex: 1, fontSize: 14, color: C.ink, paddingVertical: 10 },
  sugerenciasWrap:     { gap: 6, backgroundColor: C.surface, borderRadius: R.card, padding: 10 },
  sugerenciasTitulo:   { fontSize: 12, fontWeight: '600', color: C.muted },
  resultRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  resultImg:           { width: 32, height: 32, borderRadius: 8, backgroundColor: C.earthLight },
  resultImgPH:         { width: 32, height: 32, borderRadius: 8, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  resultNombre:        { fontSize: 13, fontWeight: '600', color: C.ink },
  resultMarca:         { fontSize: 11, color: C.muted, marginTop: 1 },
  resultPrecio:        { fontSize: 12, fontWeight: '700', color: C.earthDark },
  enlazadaWrap:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.earthLight, borderRadius: R.card, paddingHorizontal: 12, paddingVertical: 10 },
  enlazadaTexto:       { fontSize: 12, color: C.earthDark, fontWeight: '500', flex: 1 },
  inputPrecioWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingLeft: 14 },
  simbolo:             { fontSize: 14, color: C.muted, fontWeight: '600' },
  inputPrecio:         { flex: 1, paddingHorizontal: 8, paddingVertical: 12, fontSize: 14, color: C.ink },
  confirmarBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 14, marginTop: 4 },
  confirmarBtnDisabled:{ opacity: 0.4 },
  confirmarText:       { fontSize: 15, fontWeight: '700', color: '#fff' },
});
