// src/lib/conTimeout.ts
//
// En la versión web (react-native-web), expo-image-manipulator usa
// canvas.toBlob() para comprimir imágenes. En navegadores móviles
// basados en WebKit, toBlob() puede no llamar nunca a su callback
// (bug conocido con canvases grandes o poca memoria), dejando la
// promesa colgada para siempre sin resolver ni rechazar. Sin un
// timeout, eso deja botones deshabilitados indefinidamente y sin
// ningún error visible para el usuario.
export function conTimeout<T>(promesa: Promise<T>, ms: number, mensaje: string): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(mensaje)), ms)),
  ]);
}
