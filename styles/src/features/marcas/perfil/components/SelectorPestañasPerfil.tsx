// src/features/marcas/perfil/components/SelectorPestañasPerfil.tsx
//
// Pills Publicaciones/Reposts/Catálogo para el perfil de marca (propio
// y público) — mismo lenguaje visual que TabsResultados.tsx (búsqueda)
// pero desacoplado de ella y sin contadores.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C } from '../../../../shared/theme';

export type PestañaPerfilMarca = 'publicaciones' | 'reposts' | 'catalogo';

interface Props {
  activa: PestañaPerfilMarca;
  onCambiar: (tab: PestañaPerfilMarca) => void;
}

const TABS: { id: PestañaPerfilMarca; label: string }[] = [
  { id: 'publicaciones', label: 'Publicaciones' },
  { id: 'reposts', label: 'Reposts' },
  { id: 'catalogo', label: 'Catálogo' },
];

export default function SelectorPestañasPerfil({ activa, onCambiar }: Props) {
  return (
    <View style={s.fila}>
      {TABS.map((t) => {
        const esActiva = activa === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onCambiar(t.id)}
            style={[s.chip, esActiva && s.chipActivo]}
          >
            <Text style={[s.chipTexto, esActiva && s.chipTextoActivo]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, alignItems: 'center' },
  chipActivo: { backgroundColor: C.earth, borderColor: C.earth },
  chipTexto: { fontSize: 13, color: C.ink, fontWeight: '500' },
  chipTextoActivo: { color: C.white, fontWeight: '600' },
});
