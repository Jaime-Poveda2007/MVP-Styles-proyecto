// src/features/marcas/catalogo/components/TarjetaPrendaPublica.tsx
//
// Tarjeta de prenda de solo lectura para el catálogo público de una
// marca (PPerfilPublicoMarca.tsx). A diferencia del renderItem de
// PCatalogo.tsx (panel de gestión), no tiene Switch de activar/
// desactivar ni onPress de edición.
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions, Linking } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { Prenda } from '../types';
import ResumenValoracion from '../../../reseñas/components/ResumenValoracion';
import { registrarClicTienda } from '../../../feed/services/clicsTiendaService';
import { C, R } from '../../../../shared/theme';

const GAP = 8;
const PADDING = 12;

interface Props {
  prenda: Prenda;
  userId: string;
  onVerReseñas: () => void;
}

export default function TarjetaPrendaPublica({ prenda, userId, onVerReseñas }: Props) {
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;

  const abrirTienda = () => {
    if (!prenda.url_tienda) return;
    Linking.openURL(prenda.url_tienda);
    // RF-M05: telemetría fire-and-forget, nunca bloquea a quien compra.
    registrarClicTienda(prenda.id, userId).catch(() => {});
  };

  return (
    <View style={[s.card, { width: CARD_WIDTH }]}>
      {prenda.imagen_url
        ? <Image source={{ uri: prenda.imagen_url }} style={s.imagen} />
        : <View style={[s.imagen, s.imagenPlaceholder]}><Text style={s.imagenPlaceholderTexto}>Sin imagen</Text></View>
      }
      <View style={s.info}>
        <Text style={s.nombre} numberOfLines={1}>{prenda.nombre}</Text>
        <Text style={s.precio}>${prenda.precio.toLocaleString('es-CO')}</Text>
        <ResumenValoracion prendaId={prenda.id} onVerReseñas={onVerReseñas} variante="oscuro" />
        {prenda.url_tienda && (
          <TouchableOpacity style={s.verBtn} onPress={abrirTienda} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <ExternalLink size={11} color={C.earth} strokeWidth={2} />
            <Text style={s.verBtnTexto}>Ver en tienda</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: R.card, overflow: 'hidden', borderWidth: 0.5, borderColor: C.border },
  imagen: { width: '100%', aspectRatio: 1, backgroundColor: C.earthLight },
  imagenPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagenPlaceholderTexto: { color: C.muted, fontSize: 11 },
  info: { padding: 10, gap: 3 },
  nombre: { fontSize: 13, fontWeight: '600', color: C.ink },
  precio: { fontSize: 13, fontWeight: '700', color: C.earth },
  verBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start' },
  verBtnTexto: { fontSize: 11, color: C.earth, fontWeight: '600' },
});
