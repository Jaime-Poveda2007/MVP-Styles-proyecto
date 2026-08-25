// src/lib/navigationRef.ts
//
// Permite navegar desde fuera de un componente de pantalla (por
// ejemplo, desde JoystickGlobal.tsx, montado en el root de la app y
// no dentro de ningún stack). Tipado con un ParamList genérico laxo
// (en vez de uno compuesto real, que no existe: no hay un ParamList
// global que conecte los navegadores anidados de la app) — sin esto,
// TypeScript infiere `ReactNavigation.RootParamList` como `{}` y
// `navigate(...)` termina aceptando solo `never`.
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();
