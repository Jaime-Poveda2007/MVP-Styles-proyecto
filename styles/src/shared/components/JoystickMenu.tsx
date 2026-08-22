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
import React, { useCallback, useState } from 'react';
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
  measure,
  runOnJS,
  withTiming,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Search, Bell, CircleUserRound, Plus, LucideIcon } from 'lucide-react-native';
import { useTheme } from '../ThemeContext';

export type OpcionJoystick = 'agregar' | 'buscar' | 'notificaciones' | 'perfil';

interface OpcionDef {
  id: OpcionJoystick;
  etiqueta: string;
  Icono: LucideIcon;
  // Ángulo en grados, convención matemática: 0° = derecha, 90° = arriba,
  // 180° = izquierda. Se reparten en abanico sobre la mitad superior.
  angulo: number;
}

// 4 opciones: todo lo que antes vivía en el header (buscar, campana) y
// en el tab bar (perfil) se navega solo desde acá.
const OPCIONES: OpcionDef[] = [
  { id: 'buscar',         etiqueta: 'Buscar',              Icono: Search,          angulo: 160 },
  { id: 'perfil',         etiqueta: 'Perfil',              Icono: CircleUserRound, angulo: 113 },
  { id: 'agregar',        etiqueta: 'Agregar publicación', Icono: Plus,            angulo: 67 },
  { id: 'notificaciones', etiqueta: 'Notificaciones',      Icono: Bell,            angulo: 20 },
];

const DURACION_APERTURA_MS = 140; // solo la animación de entrada/salida, ya no un umbral de espera
const RADIO_ARMS = 90;            // qué tan lejos del botón aparecen los íconos
const RADIO_ZONA_MUERTA = 24;     // distancia mínima del dedo al centro para empezar a elegir opción
const TOLERANCIA_ANGULO = 45;     // si el dedo no está a menos de esto de ningún ícono, no hay selección
const NOTIF_MAX = 99;             // tope del badge: 1, 2, ... 99, 99+ se muestra igual como "99"

const BOTON_SIZE = 56;
const ICONO_SIZE = 32;

interface Props {
  onSeleccionar: (opcion: OpcionJoystick) => void;
  // Con la campana del header eliminada, el badge de notificaciones no
  // leídas se muestra directo sobre el botón central — visible siempre,
  // no solo mientras se mantiene presionado.
  notificacionesNoLeidas?: number;
}

export default function JoystickMenu({ onSeleccionar, notificacionesNoLeidas = 0 }: Props) {
  const { C } = useTheme();
  const botonRef = useAnimatedRef<Animated.View>();

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
    setEtiquetaActual(idx >= 0 ? OPCIONES[idx].etiqueta : 'Desliza hacia una opción');
  }, []);

  const ejecutarJS = useCallback((idx: number) => {
    if (idx >= 0 && idx < OPCIONES.length) onSeleccionar(OPCIONES[idx].id);
  }, [onSeleccionar]);

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
      for (let i = 0; i < OPCIONES.length; i++) {
        const diffCruda = Math.abs(anguloDedo - OPCIONES[i].angulo);
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
      {menuVisible && OPCIONES.map((op, i) => (
        <OpcionIcono key={op.id} opcion={op} indice={i} abierto={abierto} seleccionIdx={seleccionIdx} />
      ))}

      {/* Botón central — único elemento con el gesto. Ya no tiene ícono
          propio (antes era un "+" que sugería una acción directa que ya
          no existe); solo un círculo con el badge de notificaciones. */}
      <GestureDetector gesture={gesto}>
        <Animated.View ref={botonRef} style={[f.boton, { backgroundColor: C.earth, shadowColor: C.earth }, estiloBoton]}>
          <View pointerEvents="none" style={f.anilloInterior} />
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

  // Sin fondo ni círculo propio por ícono: solo flotan sobre el mismo
  // backdrop oscuro uniforme. El resaltado se nota con el agrandado
  // (scale) y con el texto de arriba, no con una caja de color.
  //
  // Importante: NO se anima "opacity" acá (solo transform). Animar
  // opacity + transform juntos sobre un Animated.View que está encima
  // de un fondo ya translúcido hace que Android promueva la vista a una
  // capa de hardware, que a veces se pinta con un recuadro visible
  // detrás del ícono. Como en abierto=0 el ícono queda exactamente
  // debajo del botón central (mismo punto, translate en 0), no hace
  // falta ocultarlo con opacity — el propio botón ya lo tapa.
  const estilo = useAnimatedStyle(() => {
    const resaltado = seleccionIdx.value === indice;
    return {
      transform: [
        { translateX: interpolate(abierto.value, [0, 1], [0, dx], Extrapolation.CLAMP) },
        { translateY: interpolate(abierto.value, [0, 1], [0, -dy], Extrapolation.CLAMP) },
        { scale: withTiming(resaltado ? 1.3 : 1, { duration: 120 }) },
      ],
    };
  });

  const Icono = opcion.Icono;

  return (
    <Animated.View pointerEvents="none" style={[f.iconoWrap, estilo]}>
      <Icono size={26} color={C.earth} strokeWidth={2.2} />
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
    bottom: 28 + BOTON_SIZE / 2 - ICONO_SIZE / 2,
    left: '50%',
    marginLeft: -ICONO_SIZE / 2,
    width: ICONO_SIZE,
    height: ICONO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    // Android le agrega una sombra rectangular por default a los
    // Animated.View de Reanimated que envuelven un SVG (el ícono),
    // aunque no se pida — se anula explícitamente acá.
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
  },
  anilloInterior: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: 'transparent',
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
