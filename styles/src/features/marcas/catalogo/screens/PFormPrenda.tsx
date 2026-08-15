// src/features/marcas/catalogo/screens/PFormPrenda.tsx
//
// RF-M02: formulario de prenda (nombre, precio, descripción, categoría,
// URL de tienda) con subida de imagen a Supabase Storage. Sirve tanto
// para crear como para editar (RF-M03 "Edición de prendas existentes")
// según si se recibe una `prenda` por parámetro.

import React, { useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, R } from '../../../../shared/theme';
import { Prenda, CategoriaPrenda, CATEGORIAS_PRENDA } from '../types';
import {
  seleccionarImagenDeGaleria, tomarFotoPrenda, comprimirImagenPrenda,
  subirImagenPrenda, crearPrenda, actualizarPrenda,
  validarUrlTienda, validarPrecio,
} from '../services/prendasService';
import { mostrarAlerta } from '../../../../lib/alerta';

interface Props {
  marcaId: string;
  prenda?: Prenda; // si viene, es edición
  onGuardado: () => void;
  onCancelar: () => void;
}

interface FormErrors {
  nombre?: string; precio?: string; categoria?: string; urlTienda?: string; imagen?: string;
}

export default function PFormPrenda({ marcaId, prenda, onGuardado, onCancelar }: Props) {
  const esEdicion = !!prenda;

  const [imagenUri, setImagenUri] = useState<string | null>(null); // nueva imagen local, si se cambió
  const [imagenActualUrl] = useState<string | null>(prenda?.imagen_url ?? null);
  const [nombre, setNombre] = useState(prenda?.nombre ?? '');
  const [precio, setPrecio] = useState(prenda ? String(prenda.precio) : '');
  const [descripcion, setDescripcion] = useState(prenda?.descripcion ?? '');
  const [categoria, setCategoria] = useState<CategoriaPrenda | null>(prenda?.categoria ?? null);
  const [urlTienda, setUrlTienda] = useState(prenda?.url_tienda ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [guardando, setGuardando] = useState(false);

  const elegirDeGaleria = async () => {
    try {
      const uri = await seleccionarImagenDeGaleria();
      if (uri) setImagenUri(uri);
    } catch (e: any) { mostrarAlerta('Error', e.message); }
  };
  const usarCamara = async () => {
    try {
      const uri = await tomarFotoPrenda();
      if (uri) setImagenUri(uri);
    } catch (e: any) { mostrarAlerta('Error', e.message); }
  };

  const validar = () => {
    const e: FormErrors = {};
    if (!nombre.trim() || nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres';
    const ePrecio = validarPrecio(precio); if (ePrecio) e.precio = ePrecio;
    if (!categoria) e.categoria = 'Selecciona una categoría';
    const eUrl = validarUrlTienda(urlTienda); if (eUrl) e.urlTienda = eUrl;
    if (!esEdicion && !imagenUri) e.imagen = 'Sube una foto del producto';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      let imagenUrl: string | undefined;
      if (imagenUri) {
        const comprimida = await comprimirImagenPrenda(imagenUri);
        imagenUrl = await subirImagenPrenda(comprimida, marcaId);
      }

      const datos = {
        nombre,
        precio: Number(precio.replace(',', '.')),
        descripcion,
        categoria: categoria!,
        urlTienda,
        ...(imagenUrl ? { imagenUrl } : {}),
      };

      if (esEdicion) {
        await actualizarPrenda(prenda!.id, datos);
      } else {
        await crearPrenda(marcaId, datos as any);
      }
      onGuardado();
    } catch (e: any) {
      mostrarAlerta('Error al guardar', e.message ?? 'Algo salió mal.');
    } finally {
      setGuardando(false);
    }
  };

  const imagenParaMostrar = imagenUri ?? imagenActualUrl;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.topBar}>
          <TouchableOpacity onPress={onCancelar}>
            <Text style={s.backText}>← Cancelar</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.titulo}>{esEdicion ? 'Editar prenda' : 'Nueva prenda'}</Text>

        {imagenParaMostrar
          ? <Image source={{ uri: imagenParaMostrar }} style={s.preview} />
          : (
            <View style={[s.preview, s.previewVacio]}>
              <Text style={{ color: C.muted }}>Sin imagen seleccionada</Text>
            </View>
          )
        }
        {errors.imagen ? <Text style={s.errorText}>{errors.imagen}</Text> : null}

        <View style={s.fila}>
          <TouchableOpacity style={s.botonSecundario} onPress={elegirDeGaleria}>
            <Text style={s.textoSecundario}>Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.botonSecundario} onPress={usarCamara}>
            <Text style={s.textoSecundario}>Cámara</Text>
          </TouchableOpacity>
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Nombre del producto</Text>
          <TextInput style={[s.input, errors.nombre && s.inputError]} placeholder="Ej. Camisa lino oversize" placeholderTextColor={C.muted} value={nombre} onChangeText={setNombre} maxLength={80} />
          {errors.nombre ? <Text style={s.errorText}>{errors.nombre}</Text> : null}
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Precio (COP)</Text>
          <TextInput style={[s.input, errors.precio && s.inputError]} placeholder="Ej. 149900" placeholderTextColor={C.muted} value={precio} onChangeText={setPrecio} keyboardType="numeric" />
          {errors.precio ? <Text style={s.errorText}>{errors.precio}</Text> : null}
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Categoría</Text>
          <View style={s.chipsFila}>
            {CATEGORIAS_PRENDA.map(cat => {
              const activo = categoria === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => { setCategoria(cat); if (errors.categoria) setErrors(prev => ({ ...prev, categoria: undefined })); }}
                  style={[s.chip, activo && s.chipActivo]}
                >
                  <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{cat}</Text>
                </Pressable>
              );
            })}
          </View>
          {errors.categoria ? <Text style={s.errorText}>{errors.categoria}</Text> : null}
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Descripción (opcional)</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Describe el producto (máx. 300 caracteres)"
            placeholderTextColor={C.muted}
            value={descripcion}
            onChangeText={(t) => setDescripcion(t.slice(0, 300))}
            multiline
            maxLength={300}
          />
          <Text style={s.contador}>{descripcion.length}/300</Text>
        </View>

        <View style={s.campo}>
          <Text style={s.label}>URL de la tienda</Text>
          <TextInput
            style={[s.input, errors.urlTienda && s.inputError]}
            placeholder="https://tutienda.com/producto"
            placeholderTextColor={C.muted}
            value={urlTienda}
            onChangeText={setUrlTienda}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.urlTienda ? <Text style={s.errorText}>{errors.urlTienda}</Text> : null}
        </View>

        <TouchableOpacity
          style={[s.botonPrincipal, guardando && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator color={C.white} />
            : <Text style={s.textoPrincipal}>{esEdicion ? 'Guardar cambios' : 'Agregar al catálogo'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.white },
  scroll:       { padding: 20, gap: 14, paddingBottom: 48 },
  topBar:       { paddingBottom: 4 },
  backText:     { fontSize: 14, color: C.earth, fontWeight: '500' },
  titulo:       { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 4 },
  preview:      { width: '100%', height: 220, borderRadius: R.card, backgroundColor: C.earthLight },
  previewVacio: { alignItems: 'center', justifyContent: 'center' },
  fila:         { flexDirection: 'row', gap: 12 },
  botonSecundario: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.btn, paddingVertical: 12, alignItems: 'center' },
  textoSecundario: { color: C.ink, fontWeight: '500' },
  campo:        { gap: 6 },
  label:        { fontSize: 13, fontWeight: '500', color: C.muted },
  input:        { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.ink },
  inputError:   { borderColor: C.error },
  textarea:     { minHeight: 80, textAlignVertical: 'top' },
  contador:     { alignSelf: 'flex-end', color: C.muted, fontSize: 12 },
  errorText:    { fontSize: 12, color: C.error },
  chipsFila:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.chip, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  chipActivo:   { backgroundColor: C.earth, borderColor: C.earth },
  chipTexto:    { fontSize: 13, color: C.ink, fontWeight: '500' },
  chipTextoActivo: { color: C.white },
  botonPrincipal: { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  textoPrincipal: { color: C.white, fontWeight: '700', fontSize: 16 },
});
