// src/shared/icons/IconCorazon.tsx
//
// Icono propio (no genérico de lucide) para la acción de Like.
// Usa react-native-svg, ya incluido en el proyecto. La silueta está
// dibujada a mano para que el relleno se sienta "de marca" (más
// redondeado y orgánico que el Heart por defecto de lucide) y para
// poder animar el cambio de estado sin depender de una librería extra.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  activo: boolean;
  size?: number;
  colorActivo?: string;
  colorInactivo?: string;
}

const HEART_PATH =
  'M12 21s-7.2-4.55-9.9-9.1C0.4 8.9 1.4 5.3 4.6 4.1c2.1-0.8 4.3 0 5.6 1.8 ' +
  '0.3 0.4 0.6 0.9 0.8 1.3 0.2-0.4 0.5-0.9 0.8-1.3 1.3-1.8 3.5-2.6 5.6-1.8 ' +
  '3.2 1.2 4.2 4.8 2.5 7.8C19.2 16.45 12 21 12 21z';

export default function IconCorazon({ activo, size = 22, colorActivo = '#C9583A', colorInactivo = '#6B5E59' }: Props) {
  const escala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!activo) return;
    escala.setValue(0.7);
    Animated.timing(escala, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    }).start();
  }, [activo]);

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={HEART_PATH}
          fill={activo ? colorActivo : 'none'}
          stroke={activo ? colorActivo : colorInactivo}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
