# Styles 

**Aplicación móvil para la identidad de estilos y apoyo a las marcas de moda en Bogotá**

Proyecto de grado — Universitaria Agustiniana | Facultad de Ingeniería | Programa de Tecnología en Desarrollo de Software
Semillero de investigación: **OpenSgroup**

---

## Descripción del proyecto

Las marcas de ropa emergentes de Bogotá enfrentan una fuerte asimetría competitiva frente a grandes cadenas internacionales (Zara, H&M, SHEIN), que dominan la visibilidad digital gracias a grandes presupuestos publicitarios. Al mismo tiempo, los consumidores con interés genuino en moda local no cuentan con un canal de descubrimiento personalizado que conecte su estilo con marcas de su ciudad.

**Styles** es una red social móvil que resuelve este problema conectando a usuarios y marcas de moda locales mediante:

- Publicación de outfits con **etiquetado interactivo** de prendas y marcas.
- Un sistema de **onboarding de estilo** (preferencias, telas y colores) que personaliza el feed desde el primer uso.
- Un **catálogo digital** de marcas con enlace directo a tienda.
- Un **panel de analítica** para que las marcas conozcan seguidores, aprobación de prendas y combinaciones recomendadas por los usuarios.
- Una **navegación ergonómica tipo joystick**, pensada para reducir la fricción de uso.

El MVP se validará mediante un piloto controlado en Bogotá con **200 usuarios** y entre **10 y 20 marcas locales** registradas, en un lanzamiento inicial para Android.

---

## Objetivo general

Desarrollar una aplicación móvil (Styles) que mejore la conexión entre los usuarios y las marcas de moda en Bogotá, por medio de una red social interactiva de descubrimiento y visibilidad, validada a través de un piloto controlado con usuarios y marcas reales.

### Objetivos específicos

1. Diseñar e implementar el módulo de **Perfilamiento y Personalización** (onboarding de estilo).
2. Desarrollar el módulo de **Catálogo Digital Interactivo**, con calificación y recomendación de prendas.
3. Implementar una interfaz de **navegación ergonómica tipo joystick**.
4. Desarrollar el módulo de **Analítica de Visibilidad** para las marcas.
5. Probar el MVP mediante un **piloto** con 200 usuarios y 10-20 marcas locales.

---

## Módulos funcionales del MVP

| Módulo | Descripción |
|---|---|
| **Perfilamiento y Personalización** | Configuración de preferencias estéticas en 3 pasos para ajustar el algoritmo del feed. |
| **Catálogo Digital Interactivo** | Gestión de inventario con etiquetado interactivo y enlaces directos a la tienda de la marca. |
| **Analítica de Visibilidad** | Métricas en tiempo real (clics, interacciones, rendimiento) para las marcas. |
| **Navegación Ergonómica** | Interfaz móvil intuitiva con menú tipo joystick. |

---

## Stack tecnológico

- **Frontend / App móvil:** [React Native](https://reactnative.dev/) + [Expo](https://docs.expo.dev/)
- **Lenguaje:** TypeScript / JavaScript
- **Backend (BaaS):** [Supabase](https://supabase.com/docs) — base de datos PostgreSQL, autenticación, Storage de imágenes y Realtime
- **Seguridad de datos:** Row Level Security (RLS) en Supabase
- **Control de versiones:** GitHub + GitHub Projects (tablero Kanban)
- **Diseño de interfaces:** Figma
- **Distribución:** Google Play Console (Android) / Apple Developer Program (iOS)

---

## Estructura del repositorio

```
MVP-Styles-proyecto/
├── .expo/           # Configuración de Expo
├── database/        # Esquema y scripts de base de datos (Supabase / PostgreSQL)
├── styles/          # Código fuente de la aplicación
├── package-lock.json
└── README.md
```

---

## Puesta en marcha

### Requisitos previos

- [Node.js](https://nodejs.org/) (LTS recomendado)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Cuenta de [Supabase](https://supabase.com/) con proyecto configurado
- App **Expo Go** en tu dispositivo móvil, o un emulador Android/iOS

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Jaime-Poveda2007/MVP-Styles-proyecto.git
cd MVP-Styles-proyecto

# Instalar dependencias
npm install

# Iniciar el proyecto con Expo
npx expo start
```

## Metodología de desarrollo

El proyecto se desarrolla bajo un **modelo de ciclo de vida incremental**, construyendo y validando el sistema en incrementos funcionales sucesivos: autenticación y onboarding → feed social → módulo de marcas → integración total. La gestión de tareas se realiza mediante un tablero **Kanban en GitHub Projects**.

Fases del modelo:

1. **Modelo de Requisitos** — a partir de encuestas (200 estudiantes) y entrevistas exploratorias con emprendedores de marcas locales.
2. **Modelo de Análisis y Diseño** — arquitectura lógica, navegación tipo joystick y estructura de datos.
3. **Modelo de Implementación** — desarrollo en React Native / TypeScript, conexión con Supabase.
4. **Modelo de Integración y Pruebas** — pruebas de unidad y usuario, estructura modular extensible.

---

## Cronograma general (36 semanas)

| Fase | Descripción |
|---|---|
| Fase 0 | Evaluación de mercado y anteproyecto |
| Fase 1 | Fundamentos técnicos (diagramas, setup, base de datos, autenticación, onboarding) |
| Fase 2 | Corazón de la app (feed, subida de fotos, etiquetado, likes en tiempo real) |
| Fase 3 | Módulo de marcas (registro, catálogo, publicaciones, botón "Ver en tienda") |
| Fase 4 | Integración total (reposts, perfiles, reseñas, búsqueda, métricas) |
| Fase 5 | Pulido y pruebas (UX/UI, accesibilidad WCAG 2.2 AA, rendimiento, compatibilidad) |
| Fase 6 | Piloto real (10-20 marcas, 200 usuarios, monitoreo y corrección) |
| Fase 7 | Cierre y grado (análisis de resultados, documentación, sustentación) |

---

## Equipo

| Nombre | Rol |
|---|---|
| Jaime Poveda | Estudiante / Desarrollador |
| Tomas Ortiz | Estudiante / Desarrollador |

**Semillero de investigación:** OpenSgroup — Programa de Tecnología en Desarrollo de Software
**Línea de investigación:** Estudios Desarrollo Software

---

## Marco de referencia

Este proyecto se enmarca en el **Documento CONPES 4069** — Política Nacional de Ciencia, Tecnología e Innovación 2022-2031, y se fundamenta teóricamente en la economía de plataformas de dos lados (Rochet & Tirole, 2003), el consumo consciente (Caruana & Chatzidakis, 2014) y la personalización de feeds sociales (Bakshy, Messing & Adamic, 2015).

Para más detalle sobre la justificación, el estado del arte, la metodología y el presupuesto, consulta el documento de anteproyecto del proyecto.

---

## 📄 Licencia

Este repositorio corresponde a un proyecto académico de grado. Su uso está sujeto a los lineamientos de la Universitaria Agustiniana.
