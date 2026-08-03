// src/features/busqueda/busqueda.api.ts
//
// RF-C03: búsqueda básica. Cada función llama a una RPC de Postgres
// que usa pg_trgm (similarity) para ordenar por relevancia y ya trae
// el límite de 30 resultados aplicado en el propio SQL — ver
// database/busqueda_setup.sql.
import { supabase } from '../../lib/supabase';
import { ResultadoPublicacion, ResultadoUsuario, ResultadoMarca } from './busqueda.types';

const MIN_CARACTERES = 2;

export async function buscarPublicaciones(termino: string): Promise<ResultadoPublicacion[]> {
  if (termino.trim().length < MIN_CARACTERES) return [];
  const { data, error } = await supabase.rpc('buscar_publicaciones', { termino: termino.trim() });
  if (error) throw error;
  return (data ?? []) as ResultadoPublicacion[];
}

export async function buscarUsuarios(termino: string): Promise<ResultadoUsuario[]> {
  if (termino.trim().length < MIN_CARACTERES) return [];
  const { data, error } = await supabase.rpc('buscar_usuarios', { termino: termino.trim() });
  if (error) throw error;
  return (data ?? []) as ResultadoUsuario[];
}

export async function buscarMarcas(termino: string): Promise<ResultadoMarca[]> {
  if (termino.trim().length < MIN_CARACTERES) return [];
  const { data, error } = await supabase.rpc('buscar_marcas', { termino: termino.trim() });
  if (error) throw error;
  return (data ?? []) as ResultadoMarca[];
}