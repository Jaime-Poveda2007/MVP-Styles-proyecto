// src/features/busqueda/busqueda.types.ts

export interface ResultadoPublicacion {
  id: string;
  imagen_url: string;
  descripcion: string | null;
  es_de_marca: boolean;
  usuario_id: string | null;
  marca_id: string | null;
  created_at: string;
  score: number;
}

export interface ResultadoUsuario {
  id: string;
  username: string;
  nombre: string;
  foto_url: string | null;
  score: number;
}

export interface ResultadoMarca {
  id: string;
  nombre: string;
  logo_url: string | null;
  categoria: string;
  score: number;
}

export interface ResultadoPublicacion {
  id: string;
  imagen_url: string;
  descripcion: string | null;
  es_de_marca: boolean;
  usuario_id: string | null;
  marca_id: string | null;
  created_at: string;
  score: number;
  prenda_coincidente: string | null; // ← nuevo
}

export type TabBusqueda = 'publicaciones' | 'usuarios' | 'marcas';