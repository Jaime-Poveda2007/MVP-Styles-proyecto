// src/features/marcas/catalogo/types.ts

export const CATEGORIAS_PRENDA = [
  'Camisas', 'Pantalones', 'Vestidos', 'Calzado', 'Accesorios', 'Otros',
] as const;

export type CategoriaPrenda = (typeof CATEGORIAS_PRENDA)[number];

export interface Prenda {
  id: string;
  marca_id: string;
  nombre: string;
  precio: number;
  descripcion: string | null;
  categoria: CategoriaPrenda;
  imagen_url: string | null;
  url_tienda: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}
