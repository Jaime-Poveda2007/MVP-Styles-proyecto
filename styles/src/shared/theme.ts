// src/shared/theme.ts
//
// Paletas clara/oscura. Los NOMBRES de los tokens no cambian entre
// modos (earth, ink, white, surface...) — lo que cambia es a qué color
// apunta cada uno. Esto es lo que permite que un archivo ya convertido
// a useTheme() reciba modo oscuro sin tener que renombrar ningún color
// en su StyleSheet: "C.white" pasa de significar "blanco literal" a
// significar "fondo de tarjeta/pantalla", y así sucesivamente.
export type ColorScheme = 'light' | 'dark';

export const lightColors = {
  earth:       '#C9583A',
  earthLight:  '#F2E8E4',
  earthDark:   '#8B3520',
  ink:         '#1A1614',
  muted:       '#6B5E59',
  surface:     '#FAF8F7',
  border:      'rgba(201,88,58,0.15)',
  white:       '#FFFFFF',
  success:     '#2D7A4F',
  error:       '#C0392B',
  errorLight:  '#FDECEA',
};

export const darkColors = {
  earth:       '#E0794F',
  earthLight:  '#2E2320',
  earthDark:   '#F0A87E',
  ink:         '#F2E9E4',
  muted:       '#A6968C',
  surface:     '#1E1815',
  border:      'rgba(224,121,79,0.25)',
  white:       '#151110',
  success:     '#4FAE7C',
  error:       '#E2685A',
  errorLight:  '#3A211D',
};

export type Colors = typeof lightColors;

export function getColors(scheme: ColorScheme): Colors {
  return scheme === 'dark' ? darkColors : lightColors;
}

// Compatibilidad: archivos que todavía no se convirtieron a useTheme()
// siguen importando C/R estáticos y se ven correctos en modo claro
// (comportamiento idéntico al de antes de que existiera modo oscuro).
export const C = lightColors;

export const R = {
  input:  12,
  btn:    14,
  card:   16,
  chip:   12,
};
