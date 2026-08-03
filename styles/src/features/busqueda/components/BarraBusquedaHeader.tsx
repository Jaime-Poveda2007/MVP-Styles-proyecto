// src/features/busqueda/components/BarraBusquedaHeader.tsx
//
// Buscador en el header del feed, al lado del wordmark. Empieza
// colapsado como solo un ícono de lupa; al tocarlo se expande con
// animación y el TextInput se enfoca de inmediato — eso ya dispara el
// teclado nativo en iOS/Android sin código adicional, y en web deja
// escribir porque el foco ocurre dentro del mismo gesto de tap.
import React, { useRef, useState } from 'react';
import {
  View, TextInput, TouchableOpacity, Animated,
  Easing, StyleSheet, Keyboard, Platform,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { C, R } from '../../../shared/theme';

interface Props {
  onBuscar: (termino: string) => void; // se llama al enviar (returnKey "search")
}

export default function BarraBusquedaHeader({ onBuscar }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [termino, setTermino] = useState('');
  const anchoAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const expandir = () => {
    setExpandido(true);
    Animated.timing(anchoAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false, // animamos "flex/width", no soporta native driver
    }).start(() => {
      // Foco explícito tras terminar la animación: dispara el teclado
      // en móvil y funciona en web porque sigue dentro del mismo ciclo
      // de interacción del usuario (tocar el ícono de lupa).
      inputRef.current?.focus();
    });
  };

  const colapsar = () => {
    Keyboard.dismiss();
    setTermino('');
    Animated.timing(anchoAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.ease),
      useNativeDriver: false,
    }).start(() => setExpandido(false));
  };

  const enviar = () => {
    const t = termino.trim();
    if (t.length >= 2) onBuscar(t);
  };

  const anchoInterpolado = anchoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220], // ancho máximo del input expandido
  });

  if (!expandido) {
    return (
      <TouchableOpacity style={s.iconBtn} onPress={expandir} accessibilityLabel="Buscar">
        <Search size={20} color={C.ink} strokeWidth={2} />
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[s.wrap, { width: anchoInterpolado }]}>
      <Search size={16} color={C.muted} strokeWidth={2} />
      <TextInput
        ref={inputRef}
        style={s.input}
        value={termino}
        onChangeText={setTermino}
        placeholder="Buscar..."
        placeholderTextColor={C.muted}
        returnKeyType="search"
        onSubmitEditing={enviar}
        // En web, permite que Enter también dispare la búsqueda sin
        // depender de eventos táctiles.
        {...(Platform.OS === 'web' ? { onKeyPress: (e: any) => { if (e.nativeEvent.key === 'Enter') enviar(); } } : {})}
      />
      <TouchableOpacity onPress={colapsar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={16} color={C.muted} strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border,
  },
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.input, paddingHorizontal: 10, height: 36,
    overflow: 'hidden',
  },
  input: {
    flex: 1, fontSize: 14, color: C.ink,
    // padding: 0 evita que Android agregue padding vertical por defecto
    // y descuadre la altura de 36 del contenedor.
    padding: 0,
  },
});