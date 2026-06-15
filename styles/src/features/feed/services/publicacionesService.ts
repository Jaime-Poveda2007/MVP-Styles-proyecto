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

export async function crearPublicacion(
  imagenUrl: string,
  descripcion: string
): Promise<void> {
  const usuarioId = await obtenerUsuarioId();

  const { error } = await supabase.from('publicaciones').insert({
    usuario_id: usuarioId,
    imagen_url: imagenUrl,
    descripcion: descripcion.trim() || null,
    es_de_marca: false,
  });

  if (error) throw error;
}

export async function obtenerFeed(): Promise<Publicacion[]> {
  const { data, error } = await supabase
    .from('publicaciones')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
