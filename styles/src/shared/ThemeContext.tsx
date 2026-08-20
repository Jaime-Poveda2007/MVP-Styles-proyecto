// src/shared/ThemeContext.tsx
//
// Modo oscuro: por defecto sigue el tema del sistema operativo
// (useColorScheme de react-native); si la persona lo cambia a mano
// desde su perfil, esa preferencia se guarda en AsyncStorage y gana
// sobre el sistema hasta que la persona la borre.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme, Colors, R, getColors } from './theme';

const STORAGE_KEY = 'styles_theme_preference';

type Preferencia = ColorScheme | 'sistema';

interface ThemeContextValue {
  scheme: ColorScheme;      // tema resuelto (el que hay que pintar)
  preferencia: Preferencia; // lo que la persona eligió (o 'sistema')
  alternarTema: () => void; // atajo: claro <-> oscuro (deja de seguir al sistema)
  C: Colors;
  R: typeof R;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const schemeSistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<Preferencia>('sistema');
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((valor) => {
        if (valor === 'light' || valor === 'dark') setPreferencia(valor);
      })
      .finally(() => setCargado(true));
  }, []);

  const scheme: ColorScheme = preferencia === 'sistema'
    ? (schemeSistema === 'dark' ? 'dark' : 'light')
    : preferencia;

  const alternarTema = () => {
    const siguiente: ColorScheme = scheme === 'dark' ? 'light' : 'dark';
    setPreferencia(siguiente);
    AsyncStorage.setItem(STORAGE_KEY, siguiente).catch(() => {});
  };

  const value = useMemo<ThemeContextValue>(() => ({
    scheme,
    preferencia,
    alternarTema,
    C: getColors(scheme),
    R,
  }), [scheme, preferencia]);

  // Evita un flash de tema equivocado mientras se lee AsyncStorage
  // (una sola lectura, muy rápida, pero mejor no pintar con el valor
  // por defecto 'sistema' si en realidad había una preferencia guardada).
  if (!cargado) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
