export interface Publicacion {
  id: string;
  usuario_id: string | null;
  marca_id: string | null;
  imagen_url: string;
  descripcion: string | null;
  es_de_marca: boolean;
  created_at: string;
}