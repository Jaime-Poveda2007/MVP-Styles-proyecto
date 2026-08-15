// src/lib/loginRateLimit.ts
//
// Bloqueo de intentos fallidos de login, validado del lado del
// servidor (funciones SECURITY DEFINER en Postgres, ver
// database/rate_limit_login_setup.sql). El estado vive en la base
// de datos, no en el dispositivo, así que no se puede evadir
// reinstalando la app ni borrando AsyncStorage.
import { supabase } from './supabase';

export interface EstadoBloqueo {
  bloqueado: boolean;
  minutosRestantes: number;
}

export interface ResultadoIntentoFallido extends EstadoBloqueo {
  intentos: number;
}

interface FilaVerificarBloqueo {
  bloqueado: boolean;
  minutos_restantes: number;
}

interface FilaIntentoFallido extends FilaVerificarBloqueo {
  intentos: number;
}

const normalizar = (email: string) => email.trim().toLowerCase();

export async function verificarBloqueo(email: string): Promise<EstadoBloqueo> {
  const { data, error } = await supabase
    .rpc('verificar_bloqueo_login', { p_email: normalizar(email) })
    .single<FilaVerificarBloqueo>();
  if (error) throw error;
  return { bloqueado: data.bloqueado, minutosRestantes: data.minutos_restantes };
}

export async function registrarIntentoFallido(email: string): Promise<ResultadoIntentoFallido> {
  const { data, error } = await supabase
    .rpc('registrar_intento_fallido_login', { p_email: normalizar(email) })
    .single<FilaIntentoFallido>();
  if (error) throw error;
  return { intentos: data.intentos, bloqueado: data.bloqueado, minutosRestantes: data.minutos_restantes };
}

export async function registrarLoginExitoso(email: string): Promise<void> {
  const { error } = await supabase.rpc('registrar_login_exitoso', { p_email: normalizar(email) });
  if (error) throw error;
}
