// src/features/auth/screens/PBienvenida.tsx
//
// Landing de bienvenida previo al registro. 3 pantallas deslizables con
// ilustraciones hechas con vistas (sin imágenes), fondo que cambia de color
// al deslizar y botón "Omitir" siempre visible. Se muestra solo la primera
// vez (ver lib/bienvenida.ts). Omitir → Login.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Platform,
  useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shirt, Heart, Sparkles, MapPin, Star, Store, ShoppingBag, ArrowRight } from 'lucide-react-native';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { C, R } from '../../../shared/theme';
import { marcarBienvenidaVista } from '../../../lib/bienvenida';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const SLIDES = [
  {
    id: 'descubre',
    eyebrow: '01 / 03',
    titulo: 'Moda local, a tu estilo',
    texto: 'Descubre outfits de personas reales y de marcas colombianas que no encuentras en los centros comerciales.',
  },
  {
    id: 'etiqueta',
    eyebrow: '02 / 03',
    titulo: 'Toca y descubre',
    texto: 'Cada prenda del outfit está etiquetada: mira marca, precio y reseñas, y ve directo a la tienda.',
  },
  {
    id: 'comunidad',
    eyebrow: '03 / 03',
    titulo: 'Apoya lo nuestro',
    texto: 'Cada vista y cada compra impulsa a las marcas locales. Tu estilo, tu comunidad.',
  },
] as const;

const FONDOS = [C.earth, C.earthDark, C.ink];
const usarNativo = Platform.OS !== 'web';

// ─── Pieza reutilizable: pin que "late" sobre una prenda ──────────────────
function PinPulso({ style }: { style?: object }) {
  const pulso = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(pulso, { toValue: 1, duration: 1600, useNativeDriver: usarNativo }),
    );
    anim.start();
    return () => anim.stop();
  }, [pulso]);
  return (
    <View style={[ill.pinWrap, style]}>
      <Animated.View
        style={[ill.pinAnillo, {
          opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
        }]}
      />
      <View style={ill.pin}><View style={ill.pinNucleo} /></View>
    </View>
  );
}

// ─── Ilustración 1: collage de fotos ──────────────────────────────────────
function IlustracionDescubre() {
  return (
    <View style={ill.caja}>
      <View style={[ill.foto, { left: 8, top: 34, width: 124, height: 168, backgroundColor: C.earthLight, transform: [{ rotate: '-8deg' }] }]}>
        <Shirt size={56} color={C.earth} strokeWidth={1.4} />
        <PinPulso style={{ position: 'absolute', left: 30, top: 62 }} />
      </View>
      <View style={[ill.foto, { right: 4, top: 70, width: 134, height: 178, backgroundColor: C.white, transform: [{ rotate: '7deg' }] }]}>
        <Heart size={52} color={C.earth} fill={C.earth} strokeWidth={1.4} />
      </View>
      <View style={[ill.foto, { left: 78, top: 0, width: 108, height: 128, backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ rotate: '2deg' }] }]}>
        <Sparkles size={40} color={C.white} strokeWidth={1.5} />
      </View>
      <View style={[ill.chip, { left: 14, bottom: 6 }]}>
        <MapPin size={14} color={C.earth} strokeWidth={2.2} />
        <Text style={ill.chipTexto}>Hecho en Colombia</Text>
      </View>
    </View>
  );
}

// ─── Ilustración 2: prenda etiquetada con su tarjeta ──────────────────────
function IlustracionEtiqueta() {
  return (
    <View style={ill.caja}>
      <View style={[ill.foto, { left: 40, top: 8, width: 210, height: 250, backgroundColor: C.earthLight, borderRadius: 32 }]}>
        <Shirt size={112} color={C.earth} strokeWidth={1.2} />
        <PinPulso style={{ position: 'absolute', left: 92, top: 96 }} />
      </View>
      <View style={ill.popup}>
        <View style={ill.popupIcono}><ShoppingBag size={18} color={C.white} strokeWidth={2} /></View>
        <View style={{ flex: 1 }}>
          <Text style={ill.popupTitulo} numberOfLines={1}>Camisa de lino</Text>
          <Text style={ill.popupSub} numberOfLines={1}>Marca local · $89.900</Text>
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <Star key={i} size={11} color="#E8A33D" fill={i < 4 ? '#E8A33D' : 'transparent'} strokeWidth={1.8} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Ilustración 3: comunidad de marcas locales ───────────────────────────
function IlustracionComunidad() {
  return (
    <View style={ill.caja}>
      <View style={ill.orbita} />
      <View style={ill.centro}>
        <Store size={64} color={C.earth} strokeWidth={1.4} />
      </View>
      <View style={[ill.chip, { left: 6, top: 30 }]}>
        <MapPin size={14} color={C.earth} strokeWidth={2.2} /><Text style={ill.chipTexto}>Bogotá</Text>
      </View>
      <View style={[ill.chip, { right: 0, top: 86 }]}>
        <MapPin size={14} color={C.earth} strokeWidth={2.2} /><Text style={ill.chipTexto}>Medellín</Text>
      </View>
      <View style={[ill.chip, { left: 30, bottom: 30 }]}>
        <MapPin size={14} color={C.earth} strokeWidth={2.2} /><Text style={ill.chipTexto}>Cali</Text>
      </View>
      <View style={[ill.corazon, { right: 40, bottom: 18 }]}>
        <Heart size={20} color={C.white} fill={C.white} strokeWidth={1.5} />
      </View>
    </View>
  );
}

const ILUSTRACIONES = [IlustracionDescubre, IlustracionEtiqueta, IlustracionComunidad];

// ─── Pantalla ─────────────────────────────────────────────────────────────
export default function BienvenidaScreen({ navigation }: Props) {
  const { width: anchoVentana, height: alto } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const ancho = Math.min(anchoVentana, 520);          // en web no se estira sin límite
  const altoPanel = Math.max(260, Math.min(alto * 0.46, 400));

  const listRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [indice, setIndice] = useState(0);
  const esUltima = indice === SLIDES.length - 1;

  const fondo = scrollX.interpolate({
    inputRange: SLIDES.map((_, i) => i * ancho),
    outputRange: FONDOS,
    extrapolate: 'clamp',
  });

  // El índice sigue al scroll en tiempo real: funciona al deslizar con el dedo
  // y también cuando el scroll lo mueve el botón (en web no hay "momentum end").
  const alScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / ancho);
    setIndice(prev => (prev === i ? prev : Math.max(0, Math.min(SLIDES.length - 1, i))));
  };

  const siguiente = () => {
    if (esUltima) return;
    const destino = indice + 1;
    setIndice(destino);
    listRef.current?.scrollToOffset({ offset: destino * ancho, animated: true });
  };

  const irALogin = () => {
    marcarBienvenidaVista();
    navigation.replace('Login');
  };

  // Se apila sobre la bienvenida, así "← Volver" en el registro regresa aquí.
  const irARegistro = () => {
    marcarBienvenidaVista();
    navigation.navigate('Register');
  };

  return (
    <Animated.View style={[b.raiz, { backgroundColor: fondo }]}>
      <SafeAreaView edges={['top']} style={[b.columna, { width: ancho }]}>

        {/* Barra superior */}
        <View style={b.barra}>
          <Text style={b.logo}>Styles</Text>
          <TouchableOpacity
            style={b.omitirPildora}
            onPress={irALogin}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Omitir la bienvenida"
          >
            <Text style={b.omitirTexto}>Omitir</Text>
          </TouchableOpacity>
        </View>

        {/* Ilustraciones (deslizables) */}
        <Animated.FlatList
          ref={listRef}
          data={SLIDES as unknown as typeof SLIDES[number][]}
          keyExtractor={s => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          style={{ height: altoPanel, flexGrow: 0 }}
          getItemLayout={(_: unknown, i: number) => ({ length: ancho, offset: ancho * i, index: i })}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false, listener: alScroll },
          )}
          renderItem={({ index }: { index: number }) => {
            const Ilustracion = ILUSTRACIONES[index];
            // Parallax: la ilustración se desplaza un poco más lento que el dedo.
            const trasladar = scrollX.interpolate({
              inputRange: [(index - 1) * ancho, index * ancho, (index + 1) * ancho],
              outputRange: [ancho * 0.28, 0, -ancho * 0.28],
              extrapolate: 'clamp',
            });
            const escala = scrollX.interpolate({
              inputRange: [(index - 1) * ancho, index * ancho, (index + 1) * ancho],
              outputRange: [0.82, 1, 0.82],
              extrapolate: 'clamp',
            });
            return (
              <View style={{ width: ancho, height: altoPanel, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={{ transform: [{ translateX: trasladar }, { scale: escala }] }}>
                  <Ilustracion />
                </Animated.View>
              </View>
            );
          }}
        />

        {/* Hoja blanca con texto y botones */}
        <View style={[b.hoja, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={b.textoPila}>
            {SLIDES.map((s, i) => {
              const rango = [(i - 0.6) * ancho, i * ancho, (i + 0.6) * ancho];
              return (
                <Animated.View
                  key={s.id}
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFillObject, {
                    opacity: scrollX.interpolate({ inputRange: rango, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                    transform: [{ translateY: scrollX.interpolate({ inputRange: rango, outputRange: [14, 0, 14], extrapolate: 'clamp' }) }],
                  }]}
                >
                  <Text style={b.eyebrow}>{s.eyebrow}</Text>
                  <Text style={b.titulo}>{s.titulo}</Text>
                  <Text style={b.texto}>{s.texto}</Text>
                </Animated.View>
              );
            })}
          </View>

          <View style={b.puntos}>
            {SLIDES.map((s, i) => {
              const rango = [(i - 1) * ancho, i * ancho, (i + 1) * ancho];
              return (
                <Animated.View
                  key={s.id}
                  style={[b.punto, {
                    width: scrollX.interpolate({ inputRange: rango, outputRange: [8, 28, 8], extrapolate: 'clamp' }),
                    opacity: scrollX.interpolate({ inputRange: rango, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' }),
                  }]}
                />
              );
            })}
          </View>

          {esUltima ? (
            <>
              <TouchableOpacity style={b.btnPrimario} onPress={irARegistro} activeOpacity={0.85}>
                <Text style={b.btnPrimarioTexto}>Crear cuenta</Text>
                <ArrowRight size={20} color={C.white} strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity style={b.btnTexto} onPress={irALogin}>
                <Text style={b.btnTextoLabel}>Ya tengo cuenta</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={b.btnPrimario} onPress={siguiente} activeOpacity={0.85}>
              <Text style={b.btnPrimarioTexto}>Siguiente</Text>
              <ArrowRight size={20} color={C.white} strokeWidth={2.4} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

// ─── Estilos de las ilustraciones ─────────────────────────────────────────
const SOMBRA = { boxShadow: '0px 10px 24px rgba(0,0,0,0.22)', elevation: 8 } as object;

const ill = StyleSheet.create({
  caja:        { width: 300, height: 280 },
  foto:        { position: 'absolute', borderRadius: 26, alignItems: 'center', justifyContent: 'center', ...SOMBRA },
  chip:        { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, ...SOMBRA },
  chipTexto:   { fontSize: 13, fontWeight: '700', color: C.ink },
  pinWrap:     { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  pinAnillo:   { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: C.white },
  pin:         { width: 26, height: 26, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  pinNucleo:   { width: 12, height: 12, borderRadius: 6, backgroundColor: C.earth },
  popup:       { position: 'absolute', right: 0, bottom: 14, width: 214, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 18, padding: 12, ...SOMBRA },
  popupIcono:  { width: 36, height: 36, borderRadius: 12, backgroundColor: C.earth, alignItems: 'center', justifyContent: 'center' },
  popupTitulo: { fontSize: 14, fontWeight: '700', color: C.ink },
  popupSub:    { fontSize: 12, color: C.muted, marginTop: 1 },
  orbita:      { position: 'absolute', left: 30, top: 20, width: 240, height: 240, borderRadius: 120, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)' },
  centro:      { position: 'absolute', left: 80, top: 70, width: 140, height: 140, borderRadius: 70, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...SOMBRA },
  corazon:     { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: C.earth, alignItems: 'center', justifyContent: 'center', ...SOMBRA },
});

// ─── Estilos de la pantalla ───────────────────────────────────────────────
const b = StyleSheet.create({
  raiz:             { flex: 1 },
  columna:          { flex: 1, alignSelf: 'center' },
  barra:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, height: 52 },
  logo:             { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: C.white },
  omitirPildora:    { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  omitirTexto:      { fontSize: 14, fontWeight: '700', color: C.white },
  hoja:             { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingHorizontal: 28, paddingTop: 28 },
  textoPila:        { height: 168 },
  eyebrow:          { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, color: C.earth, marginBottom: 8 },
  titulo:           { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, color: C.ink, marginBottom: 10 },
  texto:            { fontSize: 15.5, lineHeight: 23, color: C.muted },
  puntos:           { flexDirection: 'row', gap: 6, marginBottom: 18 },
  punto:            { height: 8, borderRadius: 4, backgroundColor: C.earth },
  btnPrimario:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.earth, borderRadius: R.btn + 4, paddingVertical: 17 },
  btnPrimarioTexto: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnTexto:         { marginTop: 6, paddingVertical: 12, alignItems: 'center' },
  btnTextoLabel:    { fontSize: 15, fontWeight: '700', color: C.earth },
});
