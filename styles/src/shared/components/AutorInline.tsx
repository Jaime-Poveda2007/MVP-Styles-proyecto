// src/shared/components/AutorInline.tsx
//
// Avatar + nombre de quien autoró algo (publicación, reseña...).
// Consolida el placeholder de inicial (letra sobre círculo) que antes
// estaba duplicado en FeedCard.tsx, PDetalle.tsx y ListaReseñas.tsx.
// Si se pasa "onPress" (RF-U10: toque en nombre/foto → perfil público),
// se envuelve en TouchableOpacity; si no, es solo texto/imagen estático.
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../theme';

interface Props {
  nombre: string | null;
  fotoUrl: string | null;
  size?: number;
  onPress?: () => void;
  nombreEstilo?: object;
}

export default function AutorInline({ nombre, fotoUrl, size = 18, onPress, nombreEstilo }: Props) {
  const avatarEstilo = { width: size, height: size, borderRadius: size / 2 };

  const contenido = (
    <>
      {fotoUrl
        ? <Image source={{ uri: fotoUrl }} style={avatarEstilo} />
        : (
          <View style={[avatarEstilo, s.avatarPH]}>
            <Text style={[s.avatarLetra, { fontSize: size * 0.5 }]}>{(nombre ?? '?')[0].toUpperCase()}</Text>
          </View>
        )
      }
      <Text style={[s.nombre, nombreEstilo]} numberOfLines={1}>{nombre ?? '—'}</Text>
    </>
  );

  if (!onPress) {
    return <View style={s.fila}>{contenido}</View>;
  }

  return (
    <TouchableOpacity style={s.fila} onPress={onPress} activeOpacity={0.7}>
      {contenido}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fila:        { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  avatarPH:    { backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  avatarLetra: { fontWeight: '700', color: C.earth },
  nombre:      { fontSize: 13, color: C.ink, fontWeight: '500', flexShrink: 1 },
});
