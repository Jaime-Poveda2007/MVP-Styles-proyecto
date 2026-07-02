// src/features/feed/types.ts

// ── Interfaz básica (tu compañero) ─────────────────────────────────────────
export interface Publicacion {
  id: string;
  usuario_id: string | null;
  marca_id: string | null;
  imagen_url: string;
  descripcion: string | null;
  es_de_marca: boolean;
  created_at: string;
  // ── Campos enriquecidos del feed (tuyos) ──────────────────────────────────
  usuario?: Autor | null;
  marca?: MarcaBasica | null;
  likes_count: number;
  reposts_count: number;
  yo_di_like: boolean;
  etiquetas: Etiqueta[];
}

// ── Tipos del feed enriquecido ──────────────────────────────────────────────
export interface Autor {
  id: string;
  nombre: string;
  username: string;
  foto_url: string | null;
}

export interface MarcaBasica {
  id: string;
  nombre: string;
  logo_url: string | null;
}

export interface Etiqueta {
  id: string;
  pos_x: number;
  pos_y: number;
  es_manual: boolean;
  nombre_manual: string | null;
  marca_manual: string | null;
  precio_manual: number | null;
  estilo: { nombre: string} | null;
  prenda: {
    id: string;
    nombre: string;
    precio: number;
    imagen_url: string | null;
    url_tienda: string | null;
    marca: { nombre: string } | null;
  } | null;
}