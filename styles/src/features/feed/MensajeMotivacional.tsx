// src/features/feed/MensajeMotivacional.tsx
//
// Franja compacta en el feed que anima a subir outfits — mensajes
// distintos que van rotando con un cross-fade, para que la persona
// vea uno diferente cada vez que abre o refresca el feed sin que
// compita con las publicaciones por protagonismo (por eso es una
// franja angosta, no un banner grande). Se puede cerrar con la "X";
// una vez cerrada, la preferencia queda guardada y no vuelve a
// aparecer (ni siquiera en otra sesión).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../shared/ThemeContext';

const MENSAJES = [
  '✨ Comparte tu outfit de hoy y sé la inspiración de alguien más',
  '📸 Tu estilo merece ser visto — sube tu look ahora',
  '🔥 ¿Ya subiste tu outfit de esta semana?',
  '💫 Cada look cuenta una historia — comparte el tuyo',
  '👗 Inspira a la comunidad con tu estilo único',
  '🌟 Publica tu outfit y descubre qué opinan los demás',
];

const INTERVALO_MS = 5000;
const STORAGE_KEY = 'styles_mensaje_motivacional_cerrado';

export default function MensajeMotivacional() {
  const { C, R } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    franja: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginTop: 10, marginBottom: 2,
      paddingHorizontal: 12, paddingVertical: 9,
      backgroundColor: C.earthLight, borderRadius: R.chip,
    },
    texto: { flex: 1, fontSize: 12, fontWeight: '600', color: C.earthDark },
    cerrarBtn: { padding: 2 },
  }), [C, R]);

  // null mientras se consulta AsyncStorage: evita un parpadeo (mostrarla
  // un instante y luego ocultarla) si la persona ya la había cerrado.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [indice, setIndice] = useState(() => Math.floor(Math.random() * MENSAJES.length));
  const opacidad = useRef(new Animated.Value(1)).current;
  const escalaIcono = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(valor => setVisible(valor !== 'true'))
      .catch(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      Animated.timing(opacidad, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setIndice(prev => (prev + 1) % MENSAJES.length);
        Animated.timing(opacidad, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [opacidad, visible]);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(escalaIcono, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(escalaIcono, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [escalaIcono, visible]);

  const cerrar = () => {
    Animated.timing(opacidad, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setVisible(false);
    });
    AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {});
  };

  if (!visible) return null;

  return (
    <Animated.View style={[s.franja, { opacity: opacidad }]}>
      <Animated.View style={{ transform: [{ scale: escalaIcono }] }}>
        <Sparkles size={14} color={C.earth} strokeWidth={2.2} />
      </Animated.View>
      <Text style={s.texto} numberOfLines={1}>{MENSAJES[indice]}</Text>
      <TouchableOpacity style={s.cerrarBtn} onPress={cerrar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={14} color={C.earthDark} strokeWidth={2.2} />
      </TouchableOpacity>
    </Animated.View>
  );
}
