// src/features/busqueda/components/TabsResultados.tsx
//
// 3 pestañas (pills) con contador — mismo lenguaje visual que los
// chips de SelectorEstilo.tsx. Debajo, renderiza la lista de la
// pestaña activa. No hace scroll horizontal porque solo son 3.
import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { C } from '../../../shared/theme';
import { TabBusqueda, ResultadoPublicacion, ResultadoUsuario, ResultadoMarca } from '../busqueda.types';
import ResultadoPublicacionRow from './ResultadoPublicacionRow';
import ResultadoUsuarioRow from './ResultadoUsuarioRow';
import ResultadoMarcaRow from './ResultadoMarcaRow';

interface Props {
  tab: TabBusqueda;
  onCambiarTab: (tab: TabBusqueda) => void;
  publicaciones: ResultadoPublicacion[];
  usuarios: ResultadoUsuario[];
  marcas: ResultadoMarca[];
  cargando: boolean;
  huboBusqueda: boolean; // false = todavía no se escribió nada
  onPressPublicacion: (item: ResultadoPublicacion) => void;
  onPressUsuario: (item: ResultadoUsuario) => void;
  onPressMarca: (item: ResultadoMarca) => void;
}

const TABS: { id: TabBusqueda; label: string }[] = [
  { id: 'publicaciones', label: 'Publicaciones' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'marcas', label: 'Marcas' },
];

export default function TabsResultados({
  tab, onCambiarTab, publicaciones, usuarios, marcas,
  cargando, huboBusqueda, onPressPublicacion, onPressUsuario, onPressMarca,
}: Props) {
  const contadores: Record<TabBusqueda, number> = {
    publicaciones: publicaciones.length,
    usuarios: usuarios.length,
    marcas: marcas.length,
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabsRow}>
        {TABS.map(t => {
          const activo = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => onCambiarTab(t.id)}
              style={[s.chip, activo && s.chipActivo]}
            >
              <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>
                {t.label}{huboBusqueda ? ` (${contadores[t.id]})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!huboBusqueda && (
        <View style={s.vacio}>
          <Text style={s.vacioTexto}>Escribe al menos 2 caracteres para buscar.</Text>
        </View>
      )}

      {huboBusqueda && !cargando && contadores[tab] === 0 && (
        <View style={s.vacio}>
          <Text style={s.vacioTexto}>Sin resultados en {TABS.find(t => t.id === tab)?.label.toLowerCase()}.</Text>
        </View>
      )}

      {huboBusqueda && tab === 'publicaciones' && (
        <FlatList
          data={publicaciones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.lista}
          renderItem={({ item }) => (
            <ResultadoPublicacionRow item={item} onPress={() => onPressPublicacion(item)} />
          )}
        />
      )}

      {huboBusqueda && tab === 'usuarios' && (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.lista}
          renderItem={({ item }) => (
            <ResultadoUsuarioRow item={item} onPress={() => onPressUsuario(item)} />
          )}
        />
      )}

      {huboBusqueda && tab === 'marcas' && (
        <FlatList
          data={marcas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.lista}
          renderItem={({ item }) => (
            <ResultadoMarcaRow item={item} onPress={() => onPressMarca(item)} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  chipActivo: { backgroundColor: C.earth, borderColor: C.earth },
  chipTexto: { fontSize: 13, color: C.ink, fontWeight: '500' },
  chipTextoActivo: { color: C.white, fontWeight: '600' },
  lista: { paddingHorizontal: 16, paddingBottom: 24 },
  vacio: { paddingTop: 48, alignItems: 'center', paddingHorizontal: 32 },
  vacioTexto: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
});