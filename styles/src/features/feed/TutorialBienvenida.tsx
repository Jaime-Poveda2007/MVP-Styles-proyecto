// src/features/feed/TutorialBienvenida.tsx
//
// Tutorial de bienvenida para usuarios normales, se muestra una única
// vez justo después del primer login (nunca a cuentas de marca — el
// componente que lo monta, PFeed.tsx, ya lo gatea con `!esDeMarca`).
// Es autocontenido: consulta AsyncStorage al montar y no renderiza
// nada (ni siquiera un parpadeo) hasta saber si ya fue visto. Una vez
// cerrado (CTA final u "Omitir"), la preferencia queda guardada y no
// vuelve a aparecer — mismo patrón que MensajeMotivacional.tsx.
//
// Diseño deliberadamente sobrio: sin emojis y sin rellenos saturados
// (nada de "neón") — iconos de línea, mucho espacio en blanco entre
// bloques, y color usado solo como acento puntual.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Camera, CircleUserRound, Heart, MessageCircle, Plus, Search, Shirt, Users } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../shared/ThemeContext';

const STORAGE_KEY = 'styles_tutorial_bienvenida_visto';

const PASOS = [
  {
    eyebrow: 'Paso 1 de 3',
    Icono: Shirt,
    titulo: 'Bienvenido a styles.',
    subtitulo: 'Tu clóset social: descubre looks, comparte los tuyos y encuentra inspiración en la comunidad.',
  },
  {
    eyebrow: 'Paso 2 de 3',
    Icono: Camera,
    titulo: 'Comparte tu estilo',
    subtitulo: 'Cada outfit que subes puede inspirar a alguien más. No te lo guardes — compártelo.',
    bullets: [
      { Icono: Heart, texto: 'Recibe likes y comentarios' },
      { Icono: Users, texto: 'Gana seguidores que aman tu estilo' },
      { Icono: MessageCircle, texto: 'Conecta con gente que viste como tú' },
    ],
  },
  {
    eyebrow: 'Paso 3 de 3',
    Icono: null,
    titulo: 'Así te mueves por la app',
    subtitulo: 'Mantén presionado el botón central y desliza para elegir.',
  },
] as const;

// Posiciones fijas (no trigonométricas) de los 4 satélites del joystick
// de demostración, formando un abanico en arco sobre el botón central
// — misma idea visual que JoystickMenu.tsx pero puramente decorativa.
const SATELITES = [
  { Icono: Search,          label: 'Buscar',         translateX: -108, bottom: 66 },
  { Icono: CircleUserRound, label: 'Perfil',         translateX: -54,  bottom: 112 },
  { Icono: Bell,            label: 'Notificaciones', translateX: 54,   bottom: 112 },
  { Icono: Plus,            label: 'Publicar',       translateX: 108,  bottom: 66 },
] as const;

interface Props {
  onFinalizar?: () => void;
}

export default function TutorialBienvenida({ onFinalizar }: Props) {
  const { C, R } = useTheme();
  const s = useMemo(() => crearEstilos(C, R), [C, R]);

  // null mientras se consulta AsyncStorage: evita mostrar el tutorial
  // un instante y luego ocultarlo si la persona ya lo había visto.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [pasoActual, setPasoActual] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(valor => setVisible(valor !== 'true'))
      .catch(() => setVisible(true));
  }, []);

  const cerrar = () => {
    setVisible(false);
    AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {});
    onFinalizar?.();
  };

  const avanzar = () => {
    if (pasoActual === PASOS.length - 1) cerrar();
    else setPasoActual(p => p + 1);
  };

  if (!visible) return null;

  const paso = PASOS[pasoActual];
  const esUltimoPaso = pasoActual === PASOS.length - 1;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={cerrar}>
      <SafeAreaView style={s.safe}>

        {/* Barra superior */}
        <View style={s.topBar}>
          <View style={s.progressWrap}>
            {PASOS.map((_, i) => (
              <View key={i} style={[s.progressSeg, i <= pasoActual && s.progressDone]} />
            ))}
          </View>
          <TouchableOpacity style={s.skipBtn} onPress={cerrar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.skipText}>Omitir</Text>
          </TouchableOpacity>
        </View>

        {/* Contenido del paso */}
        <View style={s.contenido}>
          {paso.Icono && <IlustracionAnimada Icono={paso.Icono} C={C} />}

          <Text style={s.eyebrow}>{paso.eyebrow}</Text>
          <Text style={s.titulo}>{paso.titulo}</Text>
          <Text style={s.subtitulo}>{paso.subtitulo}</Text>

          {'bullets' in paso && (
            <View style={s.bulletsWrap}>
              {paso.bullets.map(({ Icono, texto }) => (
                <View key={texto} style={s.bulletFila}>
                  <Icono size={17} color={C.muted} strokeWidth={1.8} />
                  <Text style={s.bulletTexto}>{texto}</Text>
                </View>
              ))}
            </View>
          )}

          {pasoActual === 2 && <DemoJoystick C={C} s={s} />}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity style={s.btnPrimary} onPress={avanzar} activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>{esUltimoPaso ? 'Empecemos' : 'Continuar'}</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

// Ilustración central: un ícono de línea dentro de un aro delgado, con
// una respiración sutil de escala en loop — sin rellenos de color, solo
// el trazo, para mantener el tono sobrio pedido.
function IlustracionAnimada({ Icono, C }: { Icono: typeof Shirt; C: ReturnType<typeof useTheme>['C'] }) {
  const escala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(escala, { toValue: 1.06, duration: 1100, useNativeDriver: true }),
        Animated.timing(escala, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [escala]);

  return (
    <Animated.View style={{ transform: [{ scale: escala }], marginBottom: 36 }}>
      <View style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 1.3, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
        <Icono size={34} color={C.ink} strokeWidth={1.5} />
      </View>
    </Animated.View>
  );
}

// Demo decorativa del gesto "mantén y desliza" del joystick real
// (ver JoystickMenu.tsx): un botón central, 4 satélites en abanico, y
// un punto que recorre cada uno en loop resaltándolo con un aro fino
// — sin rellenos saturados, la marca queda solo en el botón real.
function DemoJoystick({ C, s }: { C: ReturnType<typeof useTheme>['C']; s: ReturnType<typeof crearEstilos> }) {
  const [activo, setActivo] = useState(0);
  const pulso = useRef(new Animated.Value(0)).current;
  const punto = useRef(new Animated.ValueXY({ x: SATELITES[0].translateX, y: -SATELITES[0].bottom })).current;

  useEffect(() => {
    const intervalo = setInterval(() => {
      setActivo(prev => (prev + 1) % SATELITES.length);
    }, 1600);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const destino = SATELITES[activo];
    Animated.parallel([
      Animated.timing(punto, { toValue: { x: destino.translateX, y: -destino.bottom }, duration: 600, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start();
  }, [activo, punto, pulso]);

  const escalaActiva = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={s.demoArea}>
      {SATELITES.map(({ Icono, label, translateX, bottom }, i) => {
        const resaltado = i === activo;
        return (
          <Animated.View
            key={label}
            style={[
              s.satelite,
              { transform: [{ translateX }, { scale: resaltado ? escalaActiva : 1 }], bottom },
              resaltado && s.saliteActivo,
            ]}
          >
            <Icono size={19} color={resaltado ? C.earth : C.muted} strokeWidth={1.8} />
          </Animated.View>
        );
      })}

      <View style={s.botonCentral}>
        <Plus size={22} color={C.white} strokeWidth={2} />
      </View>

      <Animated.View style={[s.puntoGuia, { transform: punto.getTranslateTransform() }]} />

      <Text style={s.demoEtiqueta}>{SATELITES[activo].label}</Text>
    </View>
  );
}

function crearEstilos(C: ReturnType<typeof useTheme>['C'], R: ReturnType<typeof useTheme>['R']) {
  return StyleSheet.create({
    safe:         { flex: 1, backgroundColor: C.white },
    topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
    progressWrap: { flexDirection: 'row', gap: 6, flex: 1, marginRight: 20 },
    progressSeg:  { flex: 1, height: 2, borderRadius: 1, backgroundColor: C.border },
    progressDone: { backgroundColor: C.ink },
    skipBtn:      { paddingVertical: 8 },
    skipText:     { fontSize: 14, color: C.muted, fontWeight: '400' },
    contenido:    { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 48 },
    eyebrow:      { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.muted, marginBottom: 14 },
    titulo:       { fontSize: 25, fontWeight: '700', color: C.ink, letterSpacing: -0.4, marginBottom: 16, textAlign: 'center' },
    subtitulo:    { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
    bulletsWrap:  { marginTop: 40, gap: 22, alignSelf: 'stretch' },
    bulletFila:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
    bulletTexto:  { fontSize: 14, color: C.ink, flex: 1 },
    footer:       { padding: 24, paddingBottom: 36 },
    btnPrimary:   { backgroundColor: C.ink, borderRadius: R.btn, paddingVertical: 17, alignItems: 'center' },
    btnPrimaryText:{ color: C.white, fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },

    demoArea:      { marginTop: 44, width: 260, height: 190, alignItems: 'center' },
    botonCentral:  { position: 'absolute', bottom: 8, width: 56, height: 56, borderRadius: 28, backgroundColor: C.earth, alignItems: 'center', justifyContent: 'center' },
    satelite:      { position: 'absolute', width: 42, height: 42, borderRadius: 21, backgroundColor: C.white, borderWidth: 1.3, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    saliteActivo:  { borderColor: C.earth, borderWidth: 1.6 },
    puntoGuia:     { position: 'absolute', bottom: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink },
    demoEtiqueta:  { position: 'absolute', top: 4, fontSize: 12, fontWeight: '500', color: C.muted },
  });
}
