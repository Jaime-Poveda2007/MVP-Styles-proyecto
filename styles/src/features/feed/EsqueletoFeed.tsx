// src/features/feed/EsqueletoFeed.tsx
//
// Loading "atractivo" para la primera carga del feed: en vez de un
// ActivityIndicator centrado y una pantalla vacía, se muestra una
// cuadrícula de tarjetas fantasma con el mismo tamaño/forma que
// FeedCard, pulsando suavemente — comunica de una vez la estructura
// que va a aparecer (patrón común de "skeleton screens").
import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { useTheme } from '../../shared/ThemeContext';

const GAP     = 8;
const PADDING = 12;
const FILAS   = 3;

function TarjetaFantasma({ width, height, pulso, es }: { width: number; height: number; pulso: Animated.Value; es: any }) {
  return (
    <Animated.View style={[es.card, { width, opacity: pulso }]}>
      <View style={{ width, height, backgroundColor: es.placeholderColor }} />
      <View style={es.footer}>
        <View style={es.lineaCorta} />
        <View style={es.lineaIconos} />
      </View>
    </Animated.View>
  );
}

export default function EsqueletoFeed() {
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const CARD_WIDTH  = (width - PADDING * 2 - GAP) / 2;
  const CARD_HEIGHT = CARD_WIDTH * 1.2;
  const pulso = useRef(new Animated.Value(0.5)).current;

  const es = useMemo(() => ({
    ...StyleSheet.create({
      grid:        { paddingHorizontal: PADDING, paddingTop: 10 },
      row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: GAP },
      card:        { backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: C.border },
      footer:      { padding: 8, gap: 8 },
      lineaCorta:  { width: '55%', height: 9, borderRadius: 4, backgroundColor: C.earthLight },
      lineaIconos: { width: '30%', height: 9, borderRadius: 4, backgroundColor: C.earthLight },
    }),
    placeholderColor: C.earthLight,
  }), [C]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1,   duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={es.grid}>
      {Array.from({ length: FILAS }).map((_, fila) => (
        <View key={fila} style={es.row}>
          <TarjetaFantasma width={CARD_WIDTH} height={CARD_HEIGHT} pulso={pulso} es={es} />
          <TarjetaFantasma width={CARD_WIDTH} height={CARD_HEIGHT} pulso={pulso} es={es} />
        </View>
      ))}
    </View>
  );
}
