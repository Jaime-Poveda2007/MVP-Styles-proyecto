// src/lib/bienvenida.ts
//
// Control de la pantalla de bienvenida (landing) que se muestra antes
// del registro. Se muestra una sola vez por instalación: al omitirla o
// terminarla se guarda una marca en el dispositivo.
import AsyncStorage from '@react-native-async-storage/async-storage';

// Para probar el landing sin borrar los datos de la app, ponlo en true.
// (Déjalo en false para producción y para el piloto.)
export const MOSTRAR_BIENVENIDA_SIEMPRE = false;

const CLAVE = 'styles:bienvenida_vista';

export async function debeMostrarBienvenida(): Promise<boolean> {
  if (MOSTRAR_BIENVENIDA_SIEMPRE) return true;
  try {
    return (await AsyncStorage.getItem(CLAVE)) !== '1';
  } catch {
    // Si el almacenamiento falla, no bloqueamos el acceso a la app.
    return false;
  }
}

export async function marcarBienvenidaVista(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE, '1');
  } catch {
    // No es crítico: en el peor caso se vuelve a mostrar.
  }
}
