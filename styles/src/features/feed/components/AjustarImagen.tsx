// src/features/feed/components/AjustarImagen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { C } from '../../../shared/theme';

interface Props {
  imagenUri: string;
  imagenWidth: number;
  imagenHeight: number;
  onListo: (uriRecortada: string) => void;
  onCancelar: () => void;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

export default function AjustarImagen({
  imagenUri, imagenWidth, imagenHeight, onListo, onCancelar,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const FRAME = screenW;
  const [procesando, setProcesando] = useState(false);

  const baseScale = Math.max(FRAME / imagenWidth, FRAME / imagenHeight);

  const zoom = useSharedValue(1);
  const zoomInicio = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const txInicio = useSharedValue(0);
  const tyInicio = useSharedValue(0);

  function clamp(v: number, max: number) {
    'worklet';
    return Math.min(Math.max(v, -max), max);
  }

  const pinch = Gesture.Pinch()
    .onStart(() => { zoomInicio.value = zoom.value; })
    .onUpdate((e) => {
      let nuevo = zoomInicio.value * e.scale;
      nuevo = Math.min(Math.max(nuevo, ZOOM_MIN), ZOOM_MAX);
      zoom.value = nuevo;

      const totalScale = baseScale * zoom.value;
      const dispW = imagenWidth * totalScale;
      const dispH = imagenHeight * totalScale;
      const maxX = Math.max(0, (dispW - FRAME) / 2);
      const maxY = Math.max(0, (dispH - FRAME) / 2);
      tx.value = clamp(tx.value, maxX);
      ty.value = clamp(ty.value, maxY);
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      txInicio.value = tx.value;
      tyInicio.value = ty.value;
    })
    .onUpdate((e) => {
      const totalScale = baseScale * zoom.value;
      const dispW = imagenWidth * totalScale;
      const dispH = imagenHeight * totalScale;
      const maxX = Math.max(0, (dispW - FRAME) / 2);
      const maxY = Math.max(0, (dispH - FRAME) / 2);
      tx.value = clamp(txInicio.value + e.translationX, maxX);
      ty.value = clamp(tyInicio.value + e.translationY, maxY);
    });

  const gestoCompuesto = Gesture.Simultaneous(pinch, pan);

  const estiloImagen = useAnimatedStyle(() => {
    const totalScale = baseScale * zoom.value;
    return {
      width: imagenWidth,
      height: imagenHeight,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale: totalScale },
      ],
    };
  });

  async function confirmar() {
    setProcesando(true);
    try {
      const totalScale = baseScale * zoom.value;
      const dispW = imagenWidth * totalScale;
      const dispH = imagenHeight * totalScale;

      const originX = (dispW / 2 - FRAME / 2 - tx.value) / totalScale;
      const originY = (dispH / 2 - FRAME / 2 - ty.value) / totalScale;
      const cropSize = FRAME / totalScale;

      const resultado = await ImageManipulator.manipulateAsync(
        imagenUri,
        [{
          crop: {
            originX: Math.max(0, Math.round(originX)),
            originY: Math.max(0, Math.round(originY)),
            width: Math.round(Math.min(cropSize, imagenWidth - originX)),
            height: Math.round(Math.min(cropSize, imagenHeight - originY)),
          },
        }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      onListo(resultado.uri);
    } catch (e) {
      console.error('Error recortando imagen:', e);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={[s.marco, { width: FRAME, height: FRAME }]}>
        <GestureDetector gesture={gestoCompuesto}>
          <Animated.View style={s.centro}>
            <Animated.Image
              source={{ uri: imagenUri }}
              style={estiloImagen}
              resizeMode="cover"
            />
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={s.footer}>
        <TouchableOpacity onPress={onCancelar} disabled={procesando}>
          <Text style={s.textoSecundario}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnListo} onPress={confirmar} disabled={procesando}>
          <Text style={s.textoListo}>{procesando ? 'Procesando...' : 'Listo'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#000' },
  marco:       {
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#111',
    // @ts-ignore -- propiedad web-only, necesaria para que el navegador no le robe el gesto al pinch/pan
    touchAction: 'none',
  },
  centro:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingBottom: 32 },
  textoSecundario: { color: '#fff', fontSize: 15 },
  btnListo:    { backgroundColor: C.earth, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  textoListo:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});