import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  Pressable,
  Text,
  GestureResponderEvent,
} from 'react-native';
import SelectorTipoEtiqueta from './SelectorTipoEtiqueta';

// =========================================================
// Etiqueta en construcción (todavía no guardada en Supabase)
// =========================================================
export interface EtiquetaPendiente {
  id: string; // id temporal local (uuid generado en el cliente)
  posX: number; // 0 a 1
  posY: number; // 0 a 1
  esManual: boolean;
  prendaId?: string;
  prendaNombre?: string; // solo para mostrar el pin mientras se edita
  nombreManual?: string;
  marcaManual?: string;
  precioManual?: number;
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
  imagenUri,
  etiquetas,
  onAgregarEtiqueta,
  onEliminarEtiqueta,
  onReposicionarEtiqueta,
  maxEtiquetas = 8,
}: Props) {
  const [tamanoImagen, setTamanoImagen] = useState({ width: 0, height: 0 });
  const [puntoPendiente, setPuntoPendiente] = useState<{ x: number; y: number } | null>(
    null
  );
  const [etiquetaEditando, setEtiquetaEditando] = useState<string | null>(null);
  const contenedorRef = useRef<View>(null);

  function onTocarImagen(e: GestureResponderEvent) {
    if (etiquetas.length >= maxEtiquetas) {
      // límite alcanzado, no abrir selector
      return;
    }
    if (!contenedorRef.current) return;

    const { pageX, pageY } = e.nativeEvent;

    // measure() da la posición absoluta del contenedor en pantalla (px, py)
    // y su tamaño real renderizado (width, height). Funciona igual en
    // nativo y en web, a diferencia de locationX/locationY que en web
    // viene undefined porque el evento real es un PointerEvent del DOM.
    contenedorRef.current.measure((_x, _y, width, height, px, py) => {
      if (width === 0 || height === 0) {
        console.warn('EtiquetadoImagen: measure() devolvió tamaño 0, intenta de nuevo');
        return;
      }

      const posX = (pageX - px) / width;
      const posY = (pageY - py) / height;

      if (Number.isNaN(posX) || Number.isNaN(posY)) {
        console.warn('EtiquetadoImagen: posición calculada inválida', {
          pageX,
          pageY,
          px,
          py,
          width,
          height,
        });
        return;
      }

      // recorta a [0,1] por si el toque cae justo en el borde
      const posXClamped = Math.min(1, Math.max(0, posX));
      const posYClamped = Math.min(1, Math.max(0, posY));

      setTamanoImagen({ width, height });
      setPuntoPendiente({ x: posXClamped, y: posYClamped });
    });
  }

  function cerrarSelector() {
    setPuntoPendiente(null);
  }

  function confirmarEtiquetaCatalogo(prendaId: string, prendaNombre: string) {
    if (!puntoPendiente) return;
    onAgregarEtiqueta({
      id: `temp-${Date.now()}`,
      posX: puntoPendiente.x,
      posY: puntoPendiente.y,
      esManual: false,
      prendaId,
      prendaNombre,
    });
    setPuntoPendiente(null);
  }

  function confirmarEtiquetaManual(
    nombreManual: string,
    marcaManual?: string,
    precioManual?: number
  ) {
    if (!puntoPendiente) return;
    onAgregarEtiqueta({
      id: `temp-${Date.now()}`,
      posX: puntoPendiente.x,
      posY: puntoPendiente.y,
      esManual: true,
      nombreManual,
      marcaManual,
      precioManual,
    });
    setPuntoPendiente(null);
  }

  return (
    <View>
      <View ref={contenedorRef} collapsable={false}>
        <Pressable onPress={onTocarImagen}>
          <Image
            source={{ uri: imagenUri }}
            style={{ width: '100%', aspectRatio: 1 }}
            resizeMode="cover"
          />

          {/* Pin temporal mientras se elige catálogo/manual */}
          {puntoPendiente && (
            <View
              style={{
                position: 'absolute',
                left: puntoPendiente.x * tamanoImagen.width - 12,
                top: puntoPendiente.y * tamanoImagen.height - 12,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: 'red',
              }}
            />
          )}

          {/* Pines de etiquetas ya colocadas */}
          {etiquetas.map((etq) => (
            <Pressable
              key={etq.id}
              onPress={() => setEtiquetaEditando(etq.id)}
              style={{
                position: 'absolute',
                left: etq.posX * tamanoImagen.width - 12,
                top: etq.posY * tamanoImagen.height - 12,
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: etq.esManual ? '#999' : '#444',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10 }}>
                {etq.esManual ? 'M' : 'C'}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </View>

      <Text>
        {etiquetas.length}/{maxEtiquetas} etiquetas
      </Text>

      {/* Selector que aparece al tocar un punto nuevo */}
      {puntoPendiente && (
        <SelectorTipoEtiqueta
          onCerrar={cerrarSelector}
          onSeleccionarCatalogo={confirmarEtiquetaCatalogo}
          onSeleccionarManual={confirmarEtiquetaManual}
        />
      )}

      {/* Editar/eliminar etiqueta existente */}
      {etiquetaEditando && (
        <View>
          <Pressable
            onPress={() => {
              onEliminarEtiqueta(etiquetaEditando);
              setEtiquetaEditando(null);
            }}
          >
            <Text>Eliminar etiqueta</Text>
          </Pressable>
          <Pressable onPress={() => setEtiquetaEditando(null)}>
            <Text>Cerrar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
