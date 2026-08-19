# Changelog

Todas las notas de cambios notables en este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


### Added
- Extensión `pg_trgm` para habilitar búsquedas avanzadas y veloces por coincidencia de texto (trigramas).
- Nueva tabla `clics_tienda` para el seguimiento analítico de impresiones y redirecciones a e-commerce externos.
- Funciones PostgreSQL personalizadas `buscar_prendas()` y `prendas_relacionadas()`.
- Unificación total de `styles_database.sql` como la única **Fuente de Verdad** (15 tablas, 32 índices y 40 políticas RLS).

## [1.2.0] - 2026-02-10

### Added
- Módulo de **Métricas para Marcas** (`metricas_marca`): medición de etiquetados y clics.
- Módulo de **Reseñas y Calificaciones** (`reseñas`): sistema de calificación por estrellas (1 a 5) en prendas.
- Sistema de **Seguimiento social** (`seguimientos`): módulo para seguir/dejar de seguir usuarios con validación anti-autoseguimiento.

## [1.1.0] - 2026-01-15

### Added
- Sistema de **Reposts** (`reposts`) para volver a compartir publicaciones en el feed personal.
- Módulo de **Etiquetado Avanzado** (`etiquetas`): etiquetado mediante coordenadas X/Y relativas, soportando prendas oficiales o marca/prenda manual.
- Sistema de **Comentarios** (`comentarios`) con limitación de hasta 300 caracteres y actualización de marca temporal.

## [1.0.0] - 2025-12-01

### Added
- Arquitectura inicial de base de datos en Supabase.
- Tablas base: `usuarios`, `preferencias_usuario`, `marcas`, `prendas`, `publicaciones` y `likes`.
- Trigger automático `handle_updated_at()` para refrescar la columna `updated_at` en modificaciones.