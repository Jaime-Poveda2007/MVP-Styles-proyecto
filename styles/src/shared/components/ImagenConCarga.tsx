// src/shared/components/ImagenConCarga.tsx
//
// Loading "atractivo" para imágenes de publicaciones: mientras la
// imagen carga se muestra un shimmer (pulso de opacidad) en vez de un
// espacio en blanco o un spinner genérico, y la imagen aparece con un
// fade-in cuando termina de cargar.
import React, { useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, StyleProp, ViewStyle, ImageResizeMode } from 'react-native';
import { C } from '../theme';

interface Props {
  uri: string;
  style: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
}

export default function ImagenConCarga({ uri, style, resizeMode = 'cover' }: Props) {
  const [cargada, setCargada] = useState(false);
  const [fallo,   setFallo]   = useState(false);
  const opacidadImagen = useRef(new Animated.Value(0)).current;
  const pulso           = useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    if (cargada) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 0.9, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0.4, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cargada]);

  const onLoadEnd = () => {
    setCargada(true);
    Animated.timing(opacidadImagen, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={style}>
      {!cargada && (
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.earthLight },
            { opacity: pulso },
          ]}
        />
      )}
      <Animated.Image
        source={{ uri } as ImageSourcePropType}
        style={[{ width: '100%', height: '100%', opacity: opacidadImagen }]}
        resizeMode={resizeMode}
        onLoadEnd={onLoadEnd}
        onError={() => { setFallo(true); setCargada(true); }}
      />
    </Animated.View>
  );
}
