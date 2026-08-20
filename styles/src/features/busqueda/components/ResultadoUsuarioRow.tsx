// src/features/busqueda/components/ResultadoUsuarioRow.tsx
import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { ResultadoUsuario } from '../busqueda.types';
import { useTheme } from '../../../shared/ThemeContext';

interface Props {
  item: ResultadoUsuario;
  onPress: () => void;
}

export default function ResultadoUsuarioRow({ item, onPress }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPH: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
    avatarLetra: { fontSize: 16, fontWeight: '700', color: C.earth },
    username: { fontSize: 14, fontWeight: '700', color: C.ink },
    nombre: { fontSize: 12, color: C.muted, marginTop: 1 },
  }), [C]);

  return (
    <Pressable style={s.fila} onPress={onPress}>
      {item.foto_url ? (
        <Image source={{ uri: item.foto_url }} style={s.avatar} />
      ) : (
        <View style={s.avatarPH}>
          <Text style={s.avatarLetra}>{item.username[0]?.toUpperCase() ?? '?'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.username} numberOfLines={1}>@{item.username}</Text>
        <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>
      </View>
    </Pressable>
  );
}
