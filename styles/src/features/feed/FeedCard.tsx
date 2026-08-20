// src/features/feed/FeedCard.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Publicacion } from './types';
import { useLikes } from './useLikes';
import { useReposts } from './useReposts';
import IconCorazon from '../../shared/icons/IconCorazon';
import IconRepost from '../../shared/icons/IconRepost';
import ImagenConCarga from '../../shared/components/ImagenConCarga';
import AutorInline from '../../shared/components/AutorInline';
import { useTheme } from '../../shared/ThemeContext';
import { mostrarAlerta } from '../../lib/alerta';

const GAP = 8;
const PADDING = 12;

interface Props {
  item: Publicacion;
  userId: string;
  onPress: (item: Publicacion) => void;
  // RF-U10: toque en nombre/foto → perfil público (usuario o marca).
  onVerPerfil?: (targetId: string, esDeMarca?: boolean) => void;
  esDeMarca?: boolean;
}

export default function FeedCard({ item, userId, onPress, onVerPerfil, esDeMarca = false }: Props) {
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;
  const CARD_HEIGHT = CARD_WIDTH * 1.2; // ratio 6:5 — compacto y proporcional

  const s = useMemo(() => StyleSheet.create({
    card: { backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: C.border },
    badge: { position: 'absolute', top: 6, left: 6, backgroundColor: C.earthDark, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { color: C.white, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    footer: { padding: 8, gap: 6 },
    autorNombre: { fontSize: 11, color: C.muted, fontWeight: '500', flex: 1 },
    acciones: { flexDirection: 'row', gap: 8 },
    accionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    count: { fontSize: 11, color: C.muted, fontWeight: '500' },
  }), [C]);

  // RF-U06: no se puede dar like NI repost a una publicación propia
  const esPropia = item.usuario_id === userId || item.marca_id === userId;

  const { likes, yoLike, toggleLike } = useLikes({
    publicacionId: item.id,
    userId,
    esPropia,
    likesInicial: item.likes_count,
    yoLikeInicial: item.yo_di_like,
    esDeMarca,
  });

  const { reposts, yoRepostee, toggleRepost } = useReposts({
    publicacionId: item.id,
    userId,
    repostsInicial: item.reposts_count,
    yoReposteeInicial: item.yo_reposteo,
    esDeMarca,
  });

  const onPressLike = async () => {
    if (esPropia) {
      mostrarAlerta('No puedes dar like', 'No puedes dar like a tu propia publicación.');
      return;
    }
    await toggleLike();
  };

  const onPressRepost = async () => {
    if (esPropia) {
      mostrarAlerta('No puedes repostear', 'No puedes repostear tu propia publicación.');
      return;
    }
    await toggleRepost();
  };

  const nombre = item.es_de_marca ? item.marca?.nombre : item.usuario?.username;
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
        <AutorInline
          nombre={nombre ?? null}
          fotoUrl={fotoUrl ?? null}
          size={18}
          nombreEstilo={s.autorNombre}
          onPress={
            onVerPerfil
              ? () => onVerPerfil(item.es_de_marca ? (item.marca_id ?? '') : (item.usuario_id ?? ''), item.es_de_marca)
              : undefined
          }
        />

        <View style={s.acciones}>
          <TouchableOpacity
            style={s.accionBtn}
            onPress={onPressLike}
            disabled={esPropia}
            activeOpacity={esPropia ? 1 : 0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconCorazon activo={yoLike} size={14} colorActivo={C.earth} colorInactivo={C.muted} />
            {likes > 0 && (
              <Text style={[s.count, yoLike && { color: C.earth }]}>{likes}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.accionBtn}
            onPress={onPressRepost}
            disabled={esPropia}
            activeOpacity={esPropia ? 1 : 0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconRepost activo={yoRepostee} size={14} colorActivo={C.earth} colorInactivo={C.muted} />
            {reposts > 0 && (
              <Text style={[s.count, yoRepostee && { color: C.success }]}>{reposts}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}