// src/lib/alerta.ts
//
// Reemplaza Alert.alert en toda la app. Dos razones:
// 1. Alert.alert de react-native-web es un no-op (no muestra nada) —
//    en la versión web de la app ningún aviso se veía.
// 2. window.alert/window.confirm sí muestran algo, pero es el diálogo
//    feo del navegador, sin ningún parecido visual con la app.
// La solución es un modal propio (AlertaHost.tsx, montado una vez en
// App.tsx) con la línea gráfica de styles (mismos colores/tipografía
// de shared/theme.ts). mostrarAlerta/confirmarAccion no renderizan
// nada directamente — son funciones planas que se pueden llamar desde
// cualquier handler, así que le avisan a AlertaHost vía un listener
// simple (patrón pub/sub, igual que usan librerías de toast).
export type VarianteBoton = 'primario' | 'secundario' | 'peligro';

export interface BotonAlerta {
  texto: string;
  variante: VarianteBoton;
  onPress?: () => void;
}

export interface EstadoAlerta {
  titulo: string;
  mensaje?: string;
  botones: BotonAlerta[];
}

type Listener = (estado: EstadoAlerta) => void;
let listener: Listener | null = null;

export function registrarListenerAlerta(l: Listener | null): void {
  listener = l;
}

export function mostrarAlerta(titulo: string, mensaje?: string): void {
  listener?.({ titulo, mensaje, botones: [{ texto: 'Aceptar', variante: 'primario' }] });
}

export function mostrarBotones(titulo: string, mensaje: string, botones: BotonAlerta[]): void {
  listener?.({ titulo, mensaje, botones });
}

export function confirmarAccion(
  titulo: string,
  mensaje: string,
  onConfirmar: () => void,
  textoConfirmar: string = 'Eliminar',
): void {
  listener?.({
    titulo,
    mensaje,
    botones: [
      { texto: 'Cancelar', variante: 'secundario' },
      { texto: textoConfirmar, variante: 'peligro', onPress: onConfirmar },
    ],
  });
}
