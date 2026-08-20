// src/shared/components/PullToRefreshWeb.tsx
import React, { useRef, useState } from 'react';
import { Platform, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';

const THRESHOLD = 70;

interface Props {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export default function PullToRefreshWeb({ onRefresh, children }: Props) {
  const { C } = useTheme();
  const [activo, setActivo] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const startY = useRef(0);
  const distanciaRef = useRef(0);
  const distancia = useRef(new Animated.Value(0)).current;
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  if (Platform.OS !== 'web') return <>{children}</>;

  const onTouchStart = (e: React.TouchEvent) => {
    const scrollTop = contenedorRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0 && !refrescando) {
      startY.current = e.touches[0].clientY;
      setActivo(true);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!activo || refrescando) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      const valor = Math.min(diff * 0.5, THRESHOLD + 30);
      distanciaRef.current = valor;
      distancia.setValue(valor);
    }
  };

  const onTouchEnd = async () => {
    if (!activo) return;
    setActivo(false);
    if (distanciaRef.current >= THRESHOLD) {
      setRefrescando(true);
      Animated.spring(distancia, { toValue: THRESHOLD, useNativeDriver: false }).start();
      await onRefresh();
      setRefrescando(false);
    }
    distanciaRef.current = 0;
    Animated.spring(distancia, { toValue: 0, useNativeDriver: false }).start();
  };

  return (
    <div
      ref={contenedorRef}
      style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Animated.View style={[s.indicador, { height: distancia }]}>
        <ActivityIndicator color={C.earth} animating={activo || refrescando} />
      </Animated.View>
      {children}
    </div>
  );
}

const s = StyleSheet.create({
  indicador: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});