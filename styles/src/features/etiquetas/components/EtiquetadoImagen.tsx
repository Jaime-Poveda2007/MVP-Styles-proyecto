// src/features/etiquetas/components/EtiquetadoImagen.tsx
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Tag, Trash2, X } from 'lucide-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import SelectorTipoEtiqueta from './SelectorTipoEtiqueta';
import { C, R } from '../../../shared/theme';

// posX/posY: fracción 0-1 relativa a la imagen ORIGINAL (no al marco).
// Así el pin se queda pegado a la prenda aunque sigas haciendo zoom/pan.
export interface EtiquetaPendiente {
  id: string;
  posX: number;
  posY: number;
  esManual: boolean;
  prendaId?: string;
  prendaNombre?: string;
  nombreManual?: string;
  marcaManual?: string;
  precioManual?: number;
  estiloId?: string | null;
}

export interface EtiquetadoImagenHandle {
  /**
   * Se llama SOLO al publicar. Calcula el recorte final según cómo haya
   * quedado la foto (zoom/posición actuales) y devuelve la imagen ya
   * recortada+comprimida junto con las etiquetas convertidas a fracción
   * de ESA imagen final — listas para guardar en Supabase.
   */
  procesarParaPublicar: () => Promise<{ uri: string; etiquetas: EtiquetaPendiente[] }>;
}

interface Props {
  imagenUri: string;
  imagenWidth: number;
  imagenHeight: number;
  etiquetas: EtiquetaPendiente[];
  onAgregarEtiqueta: (etiqueta: EtiquetaPendiente) => void;
  onEliminarEtiqueta: (id: string) => void;
  onReposicionarEtiqueta: (id: string, posX: number, posY: number) => void;
  maxEtiquetas?: number;
  Selector?: React.ComponentType<{
    onCerrar: () => void;
    onSeleccionarCatalogo: (prendaId: string, prendaNombre: string, estiloId: string | null) => void;
    onSeleccionarManual: (
      nombreManual: string,
      marcaManual?: string,
      precioManual?: number,
      estiloId?: string | null
    ) => void;
  }>;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

// Pin que sigue en vivo el zoom/pan actual, porque su posición se
// calcula a partir de la fracción en la imagen ORIGINAL + la
// transformación vigente (no se "recongela" nunca).
function PinAjustable({ frac, zoom, tx, ty, baseScale, imagenWidth, imagenHeight, frame, onPress }: any) {
  const estilo = useAnimatedStyle(() => {
    const totalScale = baseScale * zoom.value;
    const dispW = imagenWidth * totalScale;
    const dispH = imagenHeight * totalScale;
    const left = (frame - dispW) / 2 + tx.value + frac.x * imagenWidth * totalScale - 14;
    const top = (frame - dispH) / 2 + ty.value + frac.y * imagenHeight * totalScale - 14;
    return { left, top };
  });
  return (
    <Animated.View style={[s.pin, estilo]}>
      <Pressable style={s.pinToque} onPress={onPress}>
        <Tag size={12} color="#fff" strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

const EtiquetadoImagen = forwardRef<EtiquetadoImagenHandle, Props>(function EtiquetadoImagen(
  {
    imagenUri, imagenWidth, imagenHeight, etiquetas, onAgregarEtiqueta, onEliminarEtiqueta,
    maxEtiquetas = 8, Selector = SelectorTipoEtiqueta,
  },
  ref
) {
  const [frame, setFrame] = useState(0); // ancho real del marco, medido con onLayout
  const [puntoPendiente, setPuntoPendiente] = useState<{ x: number; y: number } | null>(null);
  const [etiquetaEditando, setEtiquetaEditando] = useState<string | null>(null);

  const baseScale = frame > 0 ? Math.max(frame / imagenWidth, frame / imagenHeight) : 1;

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

  function limitarPan(totalScale: number) {
    'worklet';
    const dispW = imagenWidth * totalScale;
    const dispH = imagenHeight * totalScale;
    tx.value = clamp(tx.value, Math.max(0, (dispW - frame) / 2));
    ty.value = clamp(ty.value, Math.max(0, (dispH - frame) / 2));
  }

  const pinch = Gesture.Pinch()
    .onStart(() => { zoomInicio.value = zoom.value; })
    .onUpdate((e) => {
      const nuevo = Math.min(Math.max(zoomInicio.value * e.scale, ZOOM_MIN), ZOOM_MAX);
      zoom.value = nuevo;
      limitarPan(baseScale * nuevo);
    });

  const pan = Gesture.Pan()
    .onStart(() => { txInicio.value = tx.value; tyInicio.value = ty.value; })
    .onUpdate((e) => {
      tx.value = txInicio.value + e.translationX;
      ty.value = tyInicio.value + e.translationY;
      limitarPan(baseScale * zoom.value);
    });

  function manejarTap(fx: number, fy: number) {
    if (etiquetas.length >= maxEtiquetas || frame === 0) return;
    const totalScale = baseScale * zoom.value;
    const dispW = imagenWidth * totalScale;
    const dispH = imagenHeight * totalScale;
    const imgPxX = (fx - ((frame - dispW) / 2 + tx.value)) / totalScale;
    const imgPxY = (fy - ((frame - dispH) / 2 + ty.value)) / totalScale;
    setPuntoPendiente({
      x: Math.min(1, Math.max(0, imgPxX / imagenWidth)),
      y: Math.min(1, Math.max(0, imgPxY / imagenHeight)),
    });
  }

  // Toque corto y sin movimiento = etiquetar. Arrastre = mover la foto.
  // Dos dedos = zoom. Gesture.Race deja que gane el que primero califique.
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e, exito) => {
      if (exito) runOnJS(manejarTap)(e.x, e.y);
    });

  const gestos = Gesture.Race(pinch, pan, tap);

  function cerrarSelector() { setPuntoPendiente(null); }

  function confirmarEtiquetaCatalogo(prendaId: string, prendaNombre: string, estiloId: string | null) {
    if (!puntoPendiente) return;
    onAgregarEtiqueta({
      id: `temp-${Date.now()}`, posX: puntoPendiente.x, posY: puntoPendiente.y,
      esManual: false, prendaId, prendaNombre, estiloId,
    });
    setPuntoPendiente(null);
  }

  function confirmarEtiquetaManual(nombreManual: string, marcaManual?: string, precioManual?: number, estiloId?: string | null) {
    if (!puntoPendiente) return;
    onAgregarEtiqueta({
      id: `temp-${Date.now()}`, posX: puntoPendiente.x, posY: puntoPendiente.y,
      esManual: true, nombreManual, marcaManual, precioManual, estiloId,
    });
    setPuntoPendiente(null);
  }

  useImperativeHandle(ref, () => ({
    procesarParaPublicar: async () => {
      const totalScale = baseScale * zoom.value;
      const dispW = imagenWidth * totalScale;
      const dispH = imagenHeight * totalScale;
      const originX = Math.max(0, Math.round(-(((frame - dispW) / 2 + tx.value) / totalScale)));
      const originY = Math.max(0, Math.round(-(((frame - dispH) / 2 + ty.value) / totalScale)));
      const cropSize = frame / totalScale;
      const ancho = Math.round(Math.min(cropSize, imagenWidth - originX));
      const alto = Math.round(Math.min(cropSize, imagenHeight - originY));

      const resultado = await ImageManipulator.manipulateAsync(
        imagenUri,
        [
          { crop: { originX, originY, width: ancho, height: alto } },
          { resize: { width: 1080 } },
        ],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const etiquetasFinales = etiquetas.map((etq) => ({
        ...etq,
        posX: Math.min(1, Math.max(0, (etq.posX * imagenWidth - originX) / ancho)),
        posY: Math.min(1, Math.max(0, (etq.posY * imagenHeight - originY) / alto)),
      }));

      return { uri: resultado.uri, etiquetas: etiquetasFinales };
    },
  }), [etiquetas, imagenWidth, imagenHeight, imagenUri, frame, baseScale]);

  const estiloImagen = useAnimatedStyle(() => {
    const totalScale = baseScale * zoom.value;
    return {
      width: imagenWidth * totalScale,
      height: imagenHeight * totalScale,
      transform: [{ translateX: tx.value }, { translateY: ty.value }],
    };
  });

  const etiquetaSeleccionada = etiquetas.find((e) => e.id === etiquetaEditando);

  return (
    <View>
      <View
        style={s.imagenContainer}
        onLayout={(e) => setFrame(e.nativeEvent.layout.width)}
      >
        {frame > 0 && (
          <GestureDetector gesture={gestos}>
            <Animated.View style={s.centro}>
              <Animated.Image source={{ uri: imagenUri }} style={estiloImagen} resizeMode="cover" />
            </Animated.View>
          </GestureDetector>
        )}

        {puntoPendiente && frame > 0 && (() => {
          const totalScale = baseScale * zoom.value;
          return (
            <View
              style={[
                s.pinPendiente,
                {
                  left: (frame - imagenWidth * totalScale) / 2 + tx.value + puntoPendiente.x * imagenWidth * totalScale - 14,
                  top: (frame - imagenHeight * totalScale) / 2 + ty.value + puntoPendiente.y * imagenHeight * totalScale - 14,
                },
              ]}
            >
              <View style={s.pinPendientePulse} />
              <Tag size={12} color="#fff" strokeWidth={2.5} />
            </View>
          );
        })()}

        {frame > 0 && etiquetas.map((etq) => (
          <PinAjustable
            key={etq.id}
            frac={{ x: etq.posX, y: etq.posY }}
            zoom={zoom} tx={tx} ty={ty} baseScale={baseScale}
            imagenWidth={imagenWidth} imagenHeight={imagenHeight} frame={frame}
            onPress={() => setEtiquetaEditando(etq.id)}
          />
        ))}

        {etiquetas.length === 0 && !puntoPendiente && (
          <View style={s.hintBadge} pointerEvents="none">
            <Tag size={12} color={C.white} strokeWidth={2} />
            <Text style={s.hintText}>Acomoda la foto y toca para etiquetar</Text>
          </View>
        )}
      </View>

      <View style={s.contadorRow}>
        <View style={s.contadorPill}>
          <Tag size={12} color={etiquetas.length >= maxEtiquetas ? C.error : C.earth} strokeWidth={2} />
          <Text style={[s.contadorText, etiquetas.length >= maxEtiquetas && { color: C.error }]}>
            {etiquetas.length}/{maxEtiquetas} etiquetas
          </Text>
        </View>
      </View>

      {puntoPendiente && (
        <Selector
          onCerrar={cerrarSelector}
          onSeleccionarCatalogo={confirmarEtiquetaCatalogo}
          onSeleccionarManual={confirmarEtiquetaManual}
        />
      )}

      <Modal
        visible={!!etiquetaSeleccionada}
        transparent
        animationType="fade"
        onRequestClose={() => setEtiquetaEditando(null)}
        statusBarTranslucent
      >
        <Pressable style={s.editBackdrop} onPress={() => setEtiquetaEditando(null)}>
          <Pressable style={s.editCard} onPress={(e) => e.stopPropagation()}>
            {etiquetaSeleccionada && (
              <>
                <View style={s.editHeader}>
                  <View style={s.editIconWrap}><Tag size={16} color={C.earth} strokeWidth={2} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.editNombre} numberOfLines={1}>
                      {etiquetaSeleccionada.esManual ? etiquetaSeleccionada.nombreManual : etiquetaSeleccionada.prendaNombre}
                    </Text>
                    {etiquetaSeleccionada.marcaManual && <Text style={s.editMarca}>{etiquetaSeleccionada.marcaManual}</Text>}
                  </View>
                  <Pressable style={s.closeBtn} onPress={() => setEtiquetaEditando(null)}>
                    <X size={16} color={C.muted} strokeWidth={2} />
                  </Pressable>
                </View>
                <Pressable
                  style={s.eliminarBtn}
                  onPress={() => { onEliminarEtiqueta(etiquetaSeleccionada.id); setEtiquetaEditando(null); }}
                >
                  <Trash2 size={15} color={C.error} strokeWidth={2} />
                  <Text style={s.eliminarText}>Eliminar etiqueta</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});

export default EtiquetadoImagen;

const s = StyleSheet.create({
  imagenContainer: {
    borderRadius: R.card, overflow: 'hidden', backgroundColor: C.earthLight,
    aspectRatio: 1, position: 'relative',
    // @ts-ignore -- propiedad web-only, necesaria para que el navegador no le robe el gesto
    touchAction: 'none',
  },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pin: { position: 'absolute', width: 28, height: 28 },
  pinToque: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.earth, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pinPendiente: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: C.earthDark, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pinPendientePulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: C.earth, opacity: 0.25 },
  hintBadge: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(26,22,20,0.7)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  hintText: { fontSize: 12, color: '#fff', fontWeight: '500' },
  contadorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  contadorPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.earthLight, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  contadorText: { fontSize: 12, fontWeight: '600', color: C.earthDark },
  editBackdrop: { flex: 1, backgroundColor: 'rgba(26,22,20,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  editCard: { backgroundColor: C.white, borderRadius: R.card, padding: 16, width: '100%', maxWidth: 320, gap: 14 },
  editHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  editNombre: { fontSize: 14, fontWeight: '700', color: C.ink },
  editMarca: { fontSize: 12, color: C.muted, marginTop: 1 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  eliminarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.errorLight, borderRadius: R.btn, paddingVertical: 12 },
  eliminarText: { fontSize: 14, fontWeight: '600', color: C.error },
});