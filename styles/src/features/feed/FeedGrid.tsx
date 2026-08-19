// src/features/feed/FeedGrid.tsx
import React, { useCallback } from 'react';
import {
  FlatList, View, ActivityIndicator,
  StyleSheet, RefreshControl, Text, Platform,
} from 'react-native';
import { Publicacion } from './types';
import FeedCard from './FeedCard';
import EsqueletoFeed from './EsqueletoFeed';
import { C } from '../../shared/theme';
import PullToRefreshWeb from '../../shared/components/PullToRefreshWeb';

const GAP = 8;
const PADDING = 12;

interface Props {
  publicaciones: Publicacion[];
  userId: string;
  cargando: boolean;
  cargandoMas: boolean;
  hayMas: boolean;
  refrescando: boolean;
  onCargarMas: () => void;
  onRefrescar: () => void;
  onPressTarjeta: (item: Publicacion) => void;
  onVerPerfil?: (userId: string) => void;
  esDeMarca?: boolean;
}

export default function FeedGrid({
  publicaciones, userId, cargando, cargandoMas,
  hayMas, refrescando, onCargarMas, onRefrescar, onPressTarjeta, onVerPerfil, esDeMarca = false,
}: Props) {

  const keyExtractor = useCallback((item: Publicacion) => item.id, []);

  const renderItem = useCallback(({ item }: { item: Publicacion }) => (
    // Sin marginLeft/Right manual — columnWrapperStyle maneja el espacio
    <FeedCard item={item} userId={userId} onPress={onPressTarjeta} onVerPerfil={onVerPerfil} esDeMarca={esDeMarca} />
  ), [userId, onPressTarjeta, onVerPerfil, esDeMarca]);

  if (cargando) {
    return <EsqueletoFeed />;
  }

  const lista = (
    <FlatList
      data={publicaciones}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={2}
      contentContainerStyle={g.content}
      columnWrapperStyle={g.row}  // gap entre columnas aquí
      showsVerticalScrollIndicator={false}
      onEndReached={hayMas ? onCargarMas : undefined}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        cargandoMas
          ? <View style={g.footerLoader}><ActivityIndicator size="small" color={C.earth} /></View>
          : <View style={{ height: 100 }} />
      }
      ListEmptyComponent={
        <View style={g.empty}>
          <Text style={g.emptyIcon}>👗</Text>
          <Text style={g.emptyTitulo}>Tu feed está vacío</Text>
          <Text style={g.emptySub}>Publica tu primer outfit o sigue marcas locales</Text>
        </View>
      }
      // En web, el pull-to-refresh lo maneja PullToRefreshWeb, no RefreshControl
      refreshControl={
        Platform.OS === 'web' ? undefined : (
          <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={C.earth} colors={[C.earth]} />
        )
      }
      removeClippedSubviews
      maxToRenderPerBatch={6}
      windowSize={10}
      initialNumToRender={6}
    />
  );

return Platform.OS === 'web'
    ? <PullToRefreshWeb onRefresh={onRefrescar}>{lista}</PullToRefreshWeb>
    : lista;
}

const g = StyleSheet.create({
  content: { paddingHorizontal: PADDING, paddingTop: 10, paddingBottom: 20 },
  row: { justifyContent: 'space-between', marginBottom: GAP },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitulo: { fontSize: 18, fontWeight: '700', color: C.ink },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});