// src/features/etiquetas/components/EtiquetadoImagen.tsx
import React, { useRef, useState } from 'react';
import {
  View, Image, Pressable, Text,
  GestureResponderEvent, StyleSheet, Modal,
} from 'react-native';
import { Tag, Trash2, X } from 'lucide-react-native';
import SelectorTipoEtiqueta from './SelectorTipoEtiqueta';
import { C, R } from '../../../shared/theme';

// =========================================================
// Etiqueta en construcción (todavía no guardada en Supabase)
// =========================================================
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

interface Props {
  imagenUri: string;
  etiquetas: EtiquetaPendiente[];
  onAgregarEtiqueta: (etiqueta: EtiquetaPendiente) => void;
  onEliminarEtiqueta: (id: string) => void;
  onReposicionarEtiqueta: (id: string, posX: number, posY: number) => void;
  maxEtiquetas?: number;
}

export default function EtiquetadoImagen({
  imagenUri, etiquetas, onAgregarEtiqueta, onEliminarEtiqueta,
  onReposicionarEtiqueta, maxEtiquetas = 8,
}: Props) {
  const [tamanoImagen, setTamanoImagen] = useState({ width: 0, height: 0 });
  const [puntoPendiente, setPuntoPendiente] = useState<{ x: number; y: number } | null>(null);
  const [etiquetaEditando, setEtiquetaEditando] = useState<string | null>(null);
  const contenedorRef = useRef<View>(null);

  const limiteAlcanzado = etiquetas.length >= maxEtiquetas;

  function onTocarImagen(e: GestureResponderEvent) {
    if (limiteAlcanzado) return;
    if (!contenedorRef.current) return;

    const { pageX, pageY } = e.nativeEvent;

    contenedorRef.current.measure((_x, _y, width, height, px, py) => {
      if (width === 0 || height === 0) {
        console.warn('EtiquetadoImagen: measure() devolvió tamaño 0, intenta de nuevo');
        return;
      }

      const posX = (pageX - px) / width;
      const posY = (pageY - py) / height;

      if (Number.isNaN(posX) || Number.isNaN(posY)) {
        console.warn('EtiquetadoImagen: posición calculada inválida', { pageX, pageY, px, py, width, height });
        return;
      }

      const posXClamped = Math.min(1, Math.max(0, posX));
      const posYClamped = Math.min(1, Math.max(0, posY));

      setTamanoImagen({ width, height });
      setPuntoPendiente({ x: posXClamped, y: posYClamped });
    });
  }

  function cerrarSelector() {
    setPuntoPendiente(null);
  }

function confirmarEtiquetaCatalogo(prendaId: string, prendaNombre: string, estiloId: string | null) {
    if (!puntoPendiente) return;
    onAgregarEtiqueta({
      id: `temp-${Date.now()}`,
      posX: puntoPendiente.x,
      posY: puntoPendiente.y,
      esManual: false,
      prendaId,
      prendaNombre,
      estiloId,
    });
    setPuntoPendiente(null);
  }

  function confirmarEtiquetaManual(nombreManual: string, marcaManual?: string, precioManual?: number, estiloId?: string | null) {
    if (!puntoPendiente) return;
    onAgregarEtiqueta({
      id: `temp-${Date.now()}`,
      posX: puntoPendiente.x,
      posY: puntoPendiente.y,
      esManual: true,
      nombreManual,
      marcaManual,
      precioManual,
      estiloId,
    });
    setPuntoPendiente(null);
  }
  const etiquetaSeleccionada = etiquetas.find(e => e.id === etiquetaEditando);

  return (
    <View>
      <View ref={contenedorRef} collapsable={false} style={s.imagenContainer}>
        <Pressable onPress={onTocarImagen}>
          <Image
            source={{ uri: imagenUri }}
            style={s.imagen}
            resizeMode="cover"
          />

          {/* Pin temporal mientras se elige catálogo/manual */}
          {puntoPendiente && (
            <View
              style={[
                s.pinPendiente,
                {
                  left: puntoPendiente.x * tamanoImagen.width - 14,
                  top: puntoPendiente.y * tamanoImagen.height - 14,
                },
              ]}
            >
              <View style={s.pinPendientePulse} />
              <Tag size={12} color="#fff" strokeWidth={2.5} />
            </View>
          )}

          {/* Pines de etiquetas ya colocadas */}
          {etiquetas.map((etq) => (
            <Pressable
              key={etq.id}
              onPress={() => setEtiquetaEditando(etq.id)}
              style={[
                s.pin,
                {
                  left: etq.posX * tamanoImagen.width - 14,
                  top: etq.posY * tamanoImagen.height - 14,
                },
              ]}
            >
              <Tag size={12} color="#fff" strokeWidth={2.5} />
            </Pressable>
          ))}
        </Pressable>

        {/* Hint sutil cuando no hay etiquetas aún */}
        {etiquetas.length === 0 && !puntoPendiente && (
          <View style={s.hintBadge}>
            <Tag size={12} color={C.white} strokeWidth={2} />
            <Text style={s.hintText}>Toca la imagen para etiquetar</Text>
          </View>
        )}
      </View>

      {/* Contador de etiquetas */}
      <View style={s.contadorRow}>
        <View style={s.contadorPill}>
          <Tag size={12} color={limiteAlcanzado ? C.error : C.earth} strokeWidth={2} />
          <Text style={[s.contadorText, limiteAlcanzado && { color: C.error }]}>
            {etiquetas.length}/{maxEtiquetas} etiquetas
          </Text>
        </View>
        {limiteAlcanzado && (
          <Text style={s.limiteText}>Límite alcanzado</Text>
        )}
      </View>

      {/* Selector que aparece al tocar un punto nuevo */}
      {puntoPendiente && (
        <SelectorTipoEtiqueta
          onCerrar={cerrarSelector}
          onSeleccionarCatalogo={confirmarEtiquetaCatalogo}
          onSeleccionarManual={confirmarEtiquetaManual}
        />
      )}

      {/* Editar/eliminar etiqueta existente */}
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
                  <View style={s.editIconWrap}>
                    <Tag size={16} color={C.earth} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.editNombre} numberOfLines={1}>
                      {etiquetaSeleccionada.esManual
                        ? etiquetaSeleccionada.nombreManual
                        : etiquetaSeleccionada.prendaNombre}
                    </Text>
                    {etiquetaSeleccionada.marcaManual && (
                      <Text style={s.editMarca}>{etiquetaSeleccionada.marcaManual}</Text>
                    )}
                  </View>
                  <Pressable style={s.closeBtn} onPress={() => setEtiquetaEditando(null)}>
                    <X size={16} color={C.muted} strokeWidth={2} />
                  </Pressable>
                </View>

                <Pressable
                  style={s.eliminarBtn}
                  onPress={() => {
                    onEliminarEtiqueta(etiquetaSeleccionada.id);
                    setEtiquetaEditando(null);
                  }}
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
}

const s = StyleSheet.create({
  imagenContainer:    { borderRadius: R.card, overflow: 'hidden', backgroundColor: C.earthLight },
  imagen:             { width: '100%', aspectRatio: 1 },
  pin:                { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: C.earth, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  pinPendiente:       { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: C.earthDark, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  pinPendientePulse:  { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: C.earth, opacity: 0.25 },
  hintBadge:          { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(26,22,20,0.7)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  hintText:           { fontSize: 12, color: '#fff', fontWeight: '500' },
  contadorRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  contadorPill:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.earthLight, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  contadorText:       { fontSize: 12, fontWeight: '600', color: C.earthDark },
  limiteText:         { fontSize: 12, color: C.error, fontWeight: '500' },
  editBackdrop: { flex: 1, backgroundColor: 'rgba(26,22,20,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  editCard:           { backgroundColor: C.white, borderRadius: R.card, padding: 16, width: '100%', maxWidth: 320, gap: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  editHeader:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editIconWrap:       { width: 36, height: 36, borderRadius: 10, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  editNombre:         { fontSize: 14, fontWeight: '700', color: C.ink },
  editMarca:          { fontSize: 12, color: C.muted, marginTop: 1 },
  closeBtn:           { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  eliminarBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.errorLight, borderRadius: R.btn, paddingVertical: 12 },
  eliminarText:       { fontSize: 14, fontWeight: '600', color: C.error },
});