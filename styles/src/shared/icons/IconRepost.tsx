// src/shared/icons/IconRepost.tsx
//
// Icono propio de Repost, con el mismo grosor de trazo y lenguaje visual
// que IconCorazon (flechas redondeadas en vez del ícono genérico
// "Repeat2" de lucide), para que ambas acciones se vean como un set
// consistente diseñado para Styles.
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  activo?: boolean;
  size?: number;
  colorActivo?: string;
  colorInactivo?: string;
}

export default function IconRepost({ activo = false, size = 22, colorActivo = '#C9583A', colorInactivo = '#6B5E59' }: Props) {
  const color = activo ? colorActivo : colorInactivo;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 8.5h9a2 2 0 0 1 2 2v3.2"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9.3 5.7 6.3 8.5l3 2.8" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M17.5 15.5h-9a2 2 0 0 1-2-2v-3.2"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14.7 18.3 17.7 15.5l-3-2.8" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
