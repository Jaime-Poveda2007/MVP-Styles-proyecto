import React, { useState } from 'react';
import {
  View,
  Image,
  Pressable,
  Text,
  GestureResponderEvent,
  LayoutChangeEvent,
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

  function onLayoutImagen(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setTamanoImagen({ width, height });
  }

  function onTocarImagen(e: GestureResponderEvent) {
    if (etiquetas.length >= maxEtiquetas) {
      return;
    }
    if (tamanoImagen.width === 0 || tamanoImagen.height === 0) return;

    const { locationX, locationY } = e.nativeEvent;

    const posX = locationX / tamanoImagen.width;
    const posY = locationY / tamanoImagen.height;

    setPuntoPendiente({ x: posX, y: posY });
  }

  function cerrarSelector() {
    setPuntoPendiente(null);
  }

  function confirmarEtiquetaCatalogo(
    prendaId: string,
    prendaNombre: string,
    estiloId: string | null
  ) {
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

  function confirmarEtiquetaManual(
    nombreManual: string,
    marcaManual?: string,
    precioManual?: number,
    estiloId?: string | null
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
      estiloId,
    });
    setPuntoPendiente(null);
  }

  return (
    <View>
      <Pressable onPress={onTocarImagen} onLayout={onLayoutImagen}>
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
