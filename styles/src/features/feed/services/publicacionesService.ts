import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../../lib/supabase';
import { Publicacion } from '../types';
async function obtenerUsuarioId(): Promise<string> {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) throw new Error('No hay sesión activa.');
  const { data, error } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', userData.user.id)
    .single();
  if (error || !data) throw new Error('No se encontró el perfil del usuario.');
  return data.id;
}
export async function seleccionarDeGaleria(): Promise<string | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) throw new Error('Necesitamos permiso para acceder a tu galería.');
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 1,
  });
  if (resultado.canceled) return null;
  return resultado.assets[0].uri;
}
export async function tomarFoto(): Promise<string | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) throw new Error('Necesitamos permiso para usar la cámara.');
  const resultado = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    quality: 1,
  });
  if (resultado.canceled) return null;
  return resultado.assets[0].uri;
}
// Siempre comprime a 1080px / 70% — seguro y sin medir tamaño
export async function comprimirSiEsNecesario(uri: string): Promise<string> {
  const resultado = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return resultado.uri;
}
export async function subirImagen(uri: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('No hay sesión activa.');
  const respuesta = await fetch(uri);
  const arrayBuffer = await respuesta.arrayBuffer();
  const nombreArchivo = `${userData.user.id}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('publicaciones')
    .upload(nombreArchivo, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage.from('publicaciones').getPublicUrl(nombreArchivo);
  return data.publicUrl;
}
// Ahora devuelve el id de la publicación creada, necesario para
// guardar las etiquetas (RF-U09) inmediatamente después.
export async function crearPublicacion(
  imagenUrl: string,
  descripcion: string
): Promise<string> {
  const usuarioId = await obtenerUsuarioId();
  const { data, error } = await supabase
    .from('publicaciones')
    .insert({
      usuario_id: usuarioId,
      imagen_url: imagenUrl,
      descripcion: descripcion.trim() || null,
      es_de_marca: false,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
export async function obtenerFeed(): Promise<Publicacion[]> {
  const { data, error } = await supabase
    .from('publicaciones')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function eliminarPublicacion(publicacionId: string): Promise<void> {
  const { error } = await supabase.from('publicaciones').delete().eq('id', publicacionId);
  if (error) throw error;
}

// Usada por la pantalla de "prendas relacionadas": al tocar un resultado
// se abre el detalle de esa publicación con el mismo formato enriquecido
// que usa el feed (usuario/marca, etiquetas, likes).
export async function obtenerPublicacionPorId(
  publicacionId: string,
  userId: string
): Promise<Publicacion> {
  const SELECT = `
    id, imagen_url, descripcion, es_de_marca, created_at,
    usuario_id, marca_id,
    usuario:usuarios!publicaciones_usuario_id_fkey ( id, nombre, username, foto_url ),
    marca:marcas!publicaciones_marca_id_fkey ( id, nombre, logo_url ),
    etiquetas (
      id, pos_x, pos_y, es_manual,
      nombre_texto, marca_texto, precio_manual,
      prenda:prendas ( id, nombre, precio, imagen_url, url_tienda, activa, marca:marcas ( nombre ) ),
      estilo:estilos ( nombre )
    )
  `;

  const { data: p, error } = await supabase
    .from('publicaciones')
    .select(SELECT)
    .eq('id', publicacionId)
    .single();
  if (error) throw error;

  const [{ count: likesCount }, { count: repostsCount }, { data: miLike }] = await Promise.all([
    supabase.from('likes').select('*', { count: 'exact', head: true }).eq('publicacion_id', publicacionId),
    supabase.from('reposts').select('*', { count: 'exact', head: true }).eq('publicacion_id', publicacionId),
    supabase.from('likes').select('id').eq('publicacion_id', publicacionId).eq('usuario_id', userId).maybeSingle(),
  ]);

  return {
    ...(p as any),
    usuario: Array.isArray((p as any).usuario) ? (p as any).usuario[0] ?? null : (p as any).usuario ?? null,
    marca: Array.isArray((p as any).marca) ? (p as any).marca[0] ?? null : (p as any).marca ?? null,
    likes_count: likesCount ?? 0,
    reposts_count: repostsCount ?? 0,
    yo_di_like: !!miLike,
    etiquetas: (p as any).etiquetas ?? [],
  } as Publicacion;
}