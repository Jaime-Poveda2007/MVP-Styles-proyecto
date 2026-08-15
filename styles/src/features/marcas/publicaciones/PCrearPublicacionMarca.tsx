// src/features/marcas/publicaciones/PCrearPublicacionMarca.tsx
//
// RF-M04: "Creación de publicaciones desde el panel de marca" +
// "Etiquetado de prendas propias del catálogo". Mismo flujo que
// PCrearPublicacion.tsx (usuario), pero:
//  - la publicación se crea con marca_id / es_de_marca=true
//    (publicacionesMarcaService.crearPublicacionMarca)
//  - el selector de etiquetado es SelectorPrendaPropia, que solo
//    ofrece las prendas activas del catálogo de esta marca (no busca
//    en catálogos de otras marcas ni permite etiqueta manual)

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, R } from '../../../shared/theme';
import {
  seleccionarDeGaleria, tomarFoto, comprimirSiEsNecesario, subirImagen,
  crearPublicacionMarca,
} from './publicacionesMarcaService';
import EtiquetadoImagen, { EtiquetaPendiente } from '../../etiquetas/components/EtiquetadoImagen';
import { crearEtiquetaCatalogo } from '../../etiquetas/etiquetas.api';
import SelectorPrendaPropia from './SelectorPrendaPropia';
import { mostrarAlerta } from '../../../lib/alerta';
import { conTimeout } from '../../../lib/conTimeout';

interface Props {
  marcaId: string;
  onPublicado: () => void;
  onCancelar: () => void;
}

export default function PCrearPublicacionMarca({ marcaId, onPublicado, onCancelar }: Props) {
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [etiquetas, setEtiquetas] = useState<EtiquetaPendiente[]>([]);

  const elegirDeGaleria = async () => {
    try {
      const uri = await seleccionarDeGaleria();
      if (uri) setImagenUri(uri);
    } catch (e: any) { mostrarAlerta('Error', e.message); }
  };
  const usarCamara = async () => {
    try {
      const uri = await tomarFoto();
      if (uri) setImagenUri(uri);
    } catch (e: any) { mostrarAlerta('Error', e.message); }
  };

  const agregarEtiqueta = (etiqueta: EtiquetaPendiente) => setEtiquetas(prev => [...prev, etiqueta]);
  const eliminarEtiqueta = (id: string) => setEtiquetas(prev => prev.filter(e => e.id !== id));
  const reposicionarEtiqueta = (id: string, posX: number, posY: number) =>
    setEtiquetas(prev => prev.map(e => (e.id === id ? { ...e, posX, posY } : e)));

  const publicar = async () => {
    if (!imagenUri) {
      mostrarAlerta('Falta imagen', 'Selecciona o toma una foto para la publicación.');
      return;
    }
    setCargando(true);
    try {
      const uriFinal = await conTimeout(
        comprimirSiEsNecesario(imagenUri),
        20000,
        'La imagen tardó demasiado en procesarse. Intenta con otra foto.'
      );
      const url = await conTimeout(
        subirImagen(uriFinal),
        20000,
        'La subida tardó demasiado. Revisa tu conexión e intenta de nuevo.'
      );
      const publicacionId = await crearPublicacionMarca(marcaId, url, descripcion);

      // Todas las etiquetas de este flujo vienen de SelectorPrendaPropia
      // (siempre esManual=false, siempre con prendaId del catálogo propio).
      for (const etq of etiquetas) {
        if (
          typeof etq.posX !== 'number' || typeof etq.posY !== 'number' ||
          Number.isNaN(etq.posX) || Number.isNaN(etq.posY) || !etq.prendaId
        ) {
          console.error('Etiqueta con datos inválidos, se omite:', etq);
          continue;
        }
        await crearEtiquetaCatalogo({
          publicacionId,
          posX: etq.posX,
          posY: etq.posY,
          prendaId: etq.prendaId,
          estiloId: etq.estiloId,
        });
      }

      setImagenUri(null);
      setDescripcion('');
      setEtiquetas([]);
      onPublicado();
    } catch (e: any) {
      console.error('Error al publicar:', e);
      mostrarAlerta('Error al publicar', e.message ?? 'Algo salió mal.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.encabezado}>
          <TouchableOpacity onPress={onCancelar}>
            <Text style={s.cancelar}>← Cancelar</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.titulo}>Nueva publicación</Text>
        <Text style={s.subtitulo}>Etiqueta las prendas de tu catálogo directamente sobre la foto</Text>

        {imagenUri ? (
          <EtiquetadoImagen
            imagenUri={imagenUri}
            etiquetas={etiquetas}
            onAgregarEtiqueta={agregarEtiqueta}
            onEliminarEtiqueta={eliminarEtiqueta}
            onReposicionarEtiqueta={reposicionarEtiqueta}
            Selector={SelectorPrendaPropia}
          />
        ) : (
          <View style={s.placeholder}>
            <Text style={{ color: C.muted }}>Sin imagen seleccionada</Text>
          </View>
        )}

        <View style={s.fila}>
          <TouchableOpacity style={s.botonSecundario} onPress={elegirDeGaleria}>
            <Text style={s.textoSecundario}>Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.botonSecundario} onPress={usarCamara}>
            <Text style={s.textoSecundario}>Cámara</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={s.input}
          placeholder="Describe la publicación (máx. 300 caracteres)"
          placeholderTextColor={C.muted}
          value={descripcion}
          onChangeText={(t) => setDescripcion(t.slice(0, 300))}
          multiline
          maxLength={300}
        />
        <Text style={s.contador}>{descripcion.length}/300</Text>

        <TouchableOpacity
          style={[s.botonPrincipal, cargando && { opacity: 0.6 }]}
          onPress={publicar}
          disabled={cargando}
        >
          {cargando
            ? <ActivityIndicator color={C.white} />
            : <Text style={s.textoPrincipal}>Publicar</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { padding: 20, gap: 12, flexGrow: 1 },
  encabezado:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancelar:        { fontSize: 14, color: C.earth, fontWeight: '500' },
  titulo:          { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginTop: 4 },
  subtitulo:       { fontSize: 13, color: C.muted, marginBottom: 4 },
  placeholder:     { width: '100%', height: 280, borderRadius: R.card, backgroundColor: C.earthLight, justifyContent: 'center', alignItems: 'center' },
  fila:            { flexDirection: 'row', gap: 12 },
  botonSecundario: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.btn, paddingVertical: 12, alignItems: 'center' },
  textoSecundario: { color: C.ink, fontWeight: '500' },
  input:           { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: R.input, padding: 12, minHeight: 80, textAlignVertical: 'top', color: C.ink },
  contador:        { alignSelf: 'flex-end', color: C.muted, fontSize: 12 },
  botonPrincipal:  { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  textoPrincipal:  { color: C.white, fontWeight: '600', fontSize: 16 },
});
