// src/features/feed/FeedCard.tsx
import React from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, useWindowDimensions, Alert,
} from 'react-native';
import { Publicacion } from './types';
import { useLikes } from './useLikes';
import IconCorazon from '../../shared/icons/IconCorazon';
import IconRepost from '../../shared/icons/IconRepost';
import ImagenConCarga from '../../shared/components/ImagenConCarga';
import { C } from '../../shared/theme';

const GAP     = 8;
const PADDING  = 12;

interface Props {
  item: Publicacion;
  userId: string;
  onPress: (item: Publicacion) => void;
}

export default function FeedCard({ item, userId, onPress }: Props) {
  const { width }  = useWindowDimensions();
  const CARD_WIDTH  = (width - PADDING * 2 - GAP) / 2;
  const CARD_HEIGHT = CARD_WIDTH * 1.2; // ratio 6:5 — compacto y proporcional

  // RF-U06: no se puede dar like a una publicación propia (de usuario o de marca)
  const esPropia = item.usuario_id === userId || item.marca_id === userId;

  const { likes, yoLike, toggleLike } = useLikes({
    publicacionId: item.id,
    userId,
    esPropia,
    likesInicial: item.likes_count,
    yoLikeInicial: item.yo_di_like,
  });

  const onPressLike = async () => {
    if (esPropia) {
      Alert.alert('No puedes dar like', 'No puedes dar like a tu propia publicación.');
      return;
    }
    await toggleLike();
  };

  const nombre  = item.es_de_marca ? item.marca?.nombre   : item.usuario?.username;
  const fotoUrl = item.es_de_marca ? item.marca?.logo_url : item.usuario?.foto_url;

  return (
    <TouchableOpacity
      style={[s.card, { width: CARD_WIDTH }]}
      onPress={() => onPress(item)}
      activeOpacity={0.93}
    >
      <ImagenConCarga
        uri={item.imagen_url}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      />

      {item.es_de_marca && (
        <View style={s.badge}>
          <Text style={s.badgeText}>Marca</Text>
        </View>
      )}

      <View style={s.footer}>
        <View style={s.autorRow}>
          {fotoUrl
            ? <Image source={{ uri: fotoUrl }} style={s.avatar} />
            : <View style={s.avatarPH}>
                <Text style={s.avatarLetra}>{(nombre ?? '?')[0].toUpperCase()}</Text>
              </View>
          }
          <Text style={s.autorNombre} numberOfLines={1}>{nombre ?? '—'}</Text>
        </View>

        <View style={s.acciones}>
          <TouchableOpacity
            style={[s.accionBtn, esPropia && s.accionBtnDeshabilitado]}
            onPress={onPressLike}
            activeOpacity={esPropia ? 1 : 0.7}
          >
            <IconCorazon activo={yoLike} size={14} colorInactivo={esPropia ? C.border : C.muted} />
            {likes > 0 && (
              <Text style={[s.count, yoLike && { color: C.earth }]}>{likes}</Text>
            )}
          </TouchableOpacity>

          <View style={s.accionBtn}>
            <IconRepost size={14} colorInactivo={C.muted} />
            {item.reposts_count > 0 && (
              <Text style={s.count}>{item.reposts_count}</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:        { backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: C.border },
  badge:       { position: 'absolute', top: 6, left: 6, backgroundColor: C.earth, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:   { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  footer:      { padding: 8, gap: 6 },
  autorRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  avatar:      { width: 18, height: 18, borderRadius: 9 },
  avatarPH:    { width: 18, height: 18, borderRadius: 9, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  avatarLetra: { fontSize: 9, fontWeight: '700', color: C.earth },
  autorNombre: { fontSize: 11, color: C.muted, fontWeight: '500', flex: 1 },
  acciones:    { flexDirection: 'row', gap: 8 },
  accionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  accionBtnDeshabilitado: { opacity: 0.5 },
  count:       { fontSize: 11, color: C.muted, fontWeight: '500' },
});
