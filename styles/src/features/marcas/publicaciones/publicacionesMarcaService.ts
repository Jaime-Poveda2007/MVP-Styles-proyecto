// src/features/marcas/publicaciones/publicacionesMarcaService.ts
//
// RF-M04: "Creación de publicaciones desde el panel de marca".
//
// La selección/compresión/subida de imagen se reutiliza tal cual del
// feed de usuario (feed/services/publicacionesService.ts): son
// helpers genéricos de Storage/ImagePicker que no dependen de si la
// sesión es de usuario o de marca (la ruta del archivo se arma con
// auth.uid(), disponible en ambos casos). Lo único propio de marca es
// el INSERT en publicaciones con marca_id + es_de_marca = true.

import { supabase } from '../../../lib/supabase';

export {
  seleccionarDeGaleria,
  tomarFoto,
  comprimirSiEsNecesario,
  subirImagen,
} from '../../feed/services/publicacionesService';

export async function crearPublicacionMarca(
  marcaId: string,
  imagenUrl: string,
  descripcion: string
): Promise<string> {
  const { data, error } = await supabase
    .from('publicaciones')
    .insert({
      marca_id: marcaId,
      imagen_url: imagenUrl,
      descripcion: descripcion.trim() || null,
      es_de_marca: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
