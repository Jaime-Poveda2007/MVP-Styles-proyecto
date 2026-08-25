// src/shared/components/JoystickMenu.tsx
//
// Botón central que abre un menú radial estilo joystick con 4 opciones
// (Buscar, Perfil, Agregar publicación, Notificaciones):
//   - Tocar y mantener -> el abanico aparece de inmediato (fondo
//     atenuado + 4 íconos). Ya no existe un "toque corto" con acción
//     propia: el botón en sí no navega a nada por su cuenta.
//   - Deslizar el dedo resalta la opción más cercana a su ángulo
//     respecto al centro del botón; el texto de arriba muestra su
//     nombre en tiempo real.
//   - Soltar sobre una opción resaltada la ejecuta. Soltar sin ninguna
//     opción resaltada (por ejemplo, soltando enseguida sin arrastrar)
//     no hace nada — se cierra el menú sin efecto.
//
// Referencia de comportamiento visual: el botón "+" flotante tipo
// Pinterest (mantener -> abanico -> deslizar -> soltar). No se copia su
// diseño, solo el patrón de interacción.
//
// Implementado 100% con react-native-gesture-handler + react-native-reanimated,
// que ya están instalados en el proyecto (ver package.json) y ya corren
// dentro de <GestureHandlerRootView> en App.tsx — cero dependencias nuevas.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedRef,
  useDerivedValue,
  measure,
  runOnJS,
  withTiming,
  interpolate,
  interpolateColor,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Search, Bell, CircleUserRound, Plus, ArrowLeft, LucideIcon } from 'lucide-react-native';
import { useTheme } from '../ThemeContext';

export type OpcionJoystick = 'agregar' | 'buscar' | 'notificaciones' | 'perfil' | 'volver';

interface OpcionDef {
  id: OpcionJoystick;
  etiqueta: string;
  Icono: LucideIcon;
  // Ángulo en grados, convención matemática: 0° = derecha, 90° = arriba,
  // 180° = izquierda. Se reparten en abanico sobre la mitad superior.
  angulo: number;
}

// 4 opciones: todo lo que antes vivía en el header (buscar, campana) y
// en el tab bar (perfil) se navega solo desde acá. Solo se muestran
// estando en Feed — en cualquier otra pantalla el joystick usa
// OPCIONES_VOLVER en su lugar (ver prop `enFeed`).
const OPCIONES_FEED: OpcionDef[] = [
  { id: 'buscar',         etiqueta: 'Buscar',              Icono: Search,          angulo: 160 },
  { id: 'perfil',         etiqueta: 'Perfil',              Icono: CircleUserRound, angulo: 113 },
  { id: 'agregar',        etiqueta: 'Agregar publicación', Icono: Plus,            angulo: 67 },
  { id: 'notificaciones', etiqueta: 'Notificaciones',      Icono: Bell,            angulo: 20 },
];

const OPCIONES_VOLVER: OpcionDef[] = [
  { id: 'volver', etiqueta: 'Volver', Icono: ArrowLeft, angulo: 90 },
];

const DURACION_APERTURA_MS = 140; // solo la animación de entrada/salida, ya no un umbral de espera
const RADIO_ARMS = 90;            // qué tan lejos del botón aparecen los íconos
const RADIO_ZONA_MUERTA = 24;     // distancia mínima del dedo al centro para empezar a elegir opción
const TOLERANCIA_ANGULO = 45;     // si el dedo no está a menos de esto de ningún ícono, no hay selección
const NOTIF_MAX = 99;             // tope del badge: 1, 2, ... 99, 99+ se muestra igual como "99"

const BOTON_SIZE = 56;
const CIRCULO_SIZE = 46;       // diámetro del círculo blanco/marca detrás de cada ícono del abanico
const ICONO_GLYPH_SIZE = 22;   // tamaño del ícono lucide dentro del círculo
const PLUS_CENTRAL_SIZE = 26;  // tamaño del ícono Plus central

interface Props {
  onSeleccionar: (opcion: OpcionJoystick) => void;
  // Con la campana del header eliminada, el badge de notificaciones no
  // leídas se muestra directo sobre el botón central — visible siempre,
  // no solo mientras se mantiene presionado.
  notificacionesNoLeidas?: number;
  // true en Feed (abanico normal de 4 opciones), false en cualquier
  // otra pantalla (abanico reemplazado por una única opción "Volver").
  enFeed: boolean;
}

export default function JoystickMenu({ onSeleccionar, notificacionesNoLeidas = 0, enFeed }: Props) {
  const { C } = useTheme();
  const botonRef = useAnimatedRef<Animated.View>();
  const opciones = useMemo(() => (enFeed ? OPCIONES_FEED : OPCIONES_VOLVER), [enFeed]);

  const abierto = useSharedValue(0);        // progreso de apertura 0 -> 1 (solo animación)
  const seleccionIdx = useSharedValue(-1);  // -1 = ninguna opción resaltada
  const centroX = useSharedValue(0);
  const centroY = useSharedValue(0);

  const [menuVisible, setMenuVisible] = useState(false);
  const [etiquetaActual, setEtiquetaActual] = useState('Desliza hacia una opción');

  const abrirMenuJS = useCallback(() => {
    setEtiquetaActual('Desliza hacia una opción');
    setMenuVisible(true);
  }, []);

  const cerrarMenuJS = useCallback(() => setMenuVisible(false), []);

  const actualizarEtiquetaJS = useCallback((idx: number) => {
    setEtiquetaActual(idx >= 0 ? opciones[idx].etiqueta : 'Desliza hacia una opción');
  }, [opciones]);

  const ejecutarJS = useCallback((idx: number) => {
    if (idx >= 0 && idx < opciones.length) onSeleccionar(opciones[idx].id);
  }, [onSeleccionar, opciones]);

  const gesto = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      const medida = measure(botonRef);
      if (medida) {
        centroX.value = medida.pageX + medida.width / 2;
        centroY.value = medida.pageY + medida.height / 2;
      }
    })
    .onStart(() => {
      // Ya no hay distinción toque-corto vs mantener: el abanico se abre
      // apenas se toca el botón. abierto solo maneja la animación de
      // entrada, no un umbral de espera.
      abierto.value = withTiming(1, { duration: DURACION_APERTURA_MS });
      runOnJS(abrirMenuJS)();
    })
    .onUpdate((e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      const dx = e.absoluteX - centroX.value;
      const dy = centroY.value - e.absoluteY; // se invierte: en pantalla "y" crece hacia abajo
      const distancia = Math.sqrt(dx * dx + dy * dy);

      if (distancia < RADIO_ZONA_MUERTA) {
        if (seleccionIdx.value !== -1) {
          seleccionIdx.value = -1;
          runOnJS(actualizarEtiquetaJS)(-1);
        }
        return;
      }

      let anguloDedo = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (anguloDedo < 0) anguloDedo += 360;

      let mejorIdx = -1;
      let mejorDiff = 999;
      for (let i = 0; i < opciones.length; i++) {
        const diffCruda = Math.abs(anguloDedo - opciones[i].angulo);
        const diff = Math.min(diffCruda, 360 - diffCruda);
        if (diff < mejorDiff) {
          mejorDiff = diff;
          mejorIdx = i;
        }
      }
      const idxFinal = mejorDiff <= TOLERANCIA_ANGULO ? mejorIdx : -1;

      if (idxFinal !== seleccionIdx.value) {
        seleccionIdx.value = idxFinal;
        runOnJS(actualizarEtiquetaJS)(idxFinal);
      }
    })
    .onEnd(() => {
      // Sin acción por defecto: si se suelta sin ninguna opción
      // resaltada, simplemente no pasa nada.
      if (seleccionIdx.value !== -1) {
        runOnJS(ejecutarJS)(seleccionIdx.value);
      }
    })
    .onFinalize(() => {
      abierto.value = withTiming(0, { duration: DURACION_APERTURA_MS });
      seleccionIdx.value = -1;
      runOnJS(cerrarMenuJS)();
    });

  const estiloBackdrop = useAnimatedStyle(() => ({
    opacity: abierto.value,
  }));

  const estiloBoton = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(abierto.value, [0, 1], [1, 0.94], Extrapolation.CLAMP) }],
  }));

  const estiloEtiqueta = useAnimatedStyle(() => ({
    opacity: abierto.value,
    transform: [{ translateY: interpolate(abierto.value, [0, 1], [8, 0], Extrapolation.CLAMP) }],
  }));

  const estiloPlusCentral = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(abierto.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const textoBadge = notificacionesNoLeidas > NOTIF_MAX ? String(NOTIF_MAX) : String(notificacionesNoLeidas);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Fondo atenuado — puramente visual, no intercepta toques */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.65)' }, estiloBackdrop]}
      />

      {/* Etiqueta con el nombre de la opción resaltada */}
      {menuVisible && (
        <Animated.View pointerEvents="none" style={[f.etiquetaWrap, estiloEtiqueta]}>
          <View style={[f.etiquetaPill, { backgroundColor: C.ink }]}>
            <Text style={[f.etiquetaTexto, { color: C.white }]}>{etiquetaActual}</Text>
          </View>
        </Animated.View>
      )}

      {/* Íconos del abanico */}
      {menuVisible && opciones.map((op, i) => (
        <OpcionIcono key={op.id} opcion={op} indice={i} abierto={abierto} seleccionIdx={seleccionIdx} />
      ))}

      {/* Botón central — único elemento con el gesto. El "+" rota a una
          "X" mientras el menú está abierto, señalando que soltar cierra
          el abanico. */}
      <GestureDetector gesture={gesto}>
        <Animated.View ref={botonRef} style={[f.boton, { backgroundColor: C.earth, shadowColor: C.earth }, estiloBoton]}>
          <Animated.View pointerEvents="none" style={[f.plusCentral, estiloPlusCentral]}>
            <Plus size={PLUS_CENTRAL_SIZE} color={'#FFFFFF'} strokeWidth={2.5} />
          </Animated.View>
          {notificacionesNoLeidas > 0 && (
            <View pointerEvents="none" style={[f.badge, { backgroundColor: C.ink, borderColor: C.white }]}>
              <Text style={[f.badgeTexto, { color: C.white }]}>{textoBadge}</Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

interface OpcionIconoProps {
  opcion: OpcionDef;
  indice: number;
  abierto: SharedValue<number>;
  seleccionIdx: SharedValue<number>;
}

function OpcionIcono({ opcion, indice, abierto, seleccionIdx }: OpcionIconoProps) {
  const { C } = useTheme();
  const rad = (opcion.angulo * Math.PI) / 180;
  const dx = Math.cos(rad) * RADIO_ARMS;
  const dy = Math.sin(rad) * RADIO_ARMS;

  // Progreso 0..1 único que sincroniza color de fondo, escala y
  // crossfade de íconos. El color del ícono (prop de un SVG anidado) no
  // se puede animar como un style, así que se renderizan dos versiones
  // (color marca / blanca) superpuestas y se cruza su opacity.
  const resaltadoAnim = useDerivedValue(() => {
    return withTiming(seleccionIdx.value === indice ? 1 : 0, { duration: 120 });
  });

  const estiloCirculo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(resaltadoAnim.value, [0, 1], ['#FFFFFF', C.earth]),
    transform: [
      { translateX: interpolate(abierto.value, [0, 1], [0, dx], Extrapolation.CLAMP) },
      { translateY: interpolate(abierto.value, [0, 1], [0, -dy], Extrapolation.CLAMP) },
      { scale: interpolate(resaltadoAnim.value, [0, 1], [1, 1.3], Extrapolation.CLAMP) },
    ],
  }));

  const estiloIconoEarth = useAnimatedStyle(() => ({
    opacity: interpolate(resaltadoAnim.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  const estiloIconoBlanco = useAnimatedStyle(() => ({
    opacity: resaltadoAnim.value,
  }));

  const Icono = opcion.Icono;

  return (
    <Animated.View pointerEvents="none" style={[f.iconoWrap, estiloCirculo]}>
      <Animated.View style={[f.iconoCentro, estiloIconoEarth]}>
        <Icono size={ICONO_GLYPH_SIZE} color={C.earth} strokeWidth={2.2} />
      </Animated.View>
      <Animated.View style={[f.iconoCentro, estiloIconoBlanco]}>
        <Icono size={ICONO_GLYPH_SIZE} color={'#FFFFFF'} strokeWidth={2.2} />
      </Animated.View>
    </Animated.View>
  );
}

const f = StyleSheet.create({
  boton: {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    marginLeft: -BOTON_SIZE / 2,
    width: BOTON_SIZE,
    height: BOTON_SIZE,
    borderRadius: BOTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  iconoWrap: {
    position: 'absolute',
    bottom: 28 + BOTON_SIZE / 2 - CIRCULO_SIZE / 2,
    left: '50%',
    marginLeft: -CIRCULO_SIZE / 2,
    width: CIRCULO_SIZE,
    height: CIRCULO_SIZE,
    borderRadius: CIRCULO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconoCentro: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // Android le agrega una sombra rectangular por default a los
    // Animated.View de Reanimated que envuelven un SVG (el ícono),
    // aunque no se pida — se anula explícitamente acá. La sombra que sí
    // queremos vive en iconoWrap, que no envuelve un SVG directamente.
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
  },
  plusCentral: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquetaWrap: {
    position: 'absolute',
    bottom: 28 + BOTON_SIZE + RADIO_ARMS + 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  etiquetaPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  etiquetaTexto: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  badgeTexto: {
    fontSize: 10,
    fontWeight: '700',
  },
});
