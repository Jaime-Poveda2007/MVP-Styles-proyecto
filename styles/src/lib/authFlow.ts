// src/lib/authFlow.ts
//
// Piezas compartidas del flujo de verificación por código (OTP) del correo.
//
// - LONGITUD_OTP debe coincidir con "Email OTP Length" en
//   Supabase → Authentication → Sign In / Providers → Email (hoy: 8).
// - La bandera de recuperación evita que App.tsx, al ver la sesión que
//   crea verifyOtp({ type: 'recovery' }), mande a la persona al Home
//   antes de que termine de cambiar su contraseña.

export const LONGITUD_OTP = 8;
export const SEGUNDOS_REENVIO = 60;

let recuperandoPassword = false;

export const iniciarRecuperacion = () => { recuperandoPassword = true; };
export const terminarRecuperacion = () => { recuperandoPassword = false; };
export const recuperacionActiva = () => recuperandoPassword;

export const soloDigitos = (v: string) => v.replace(/\D/g, '').slice(0, LONGITUD_OTP);

// Mismas reglas que el registro (RF-U01): mín. 8, una mayúscula, un número.
export const validarPassword = (p: string): string | undefined => {
  if (p.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(p)) return 'Debe incluir una mayúscula';
  if (!/[0-9]/.test(p)) return 'Debe incluir un número';
  return undefined;
};

// Traduce los errores más comunes de Supabase Auth a mensajes claros.
export function mensajeErrorOtp(error: { code?: string; message?: string; status?: number }): string {
  if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
    return 'Pediste demasiados correos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (error.code === 'same_password') {
    return 'La nueva contraseña debe ser diferente a la anterior.';
  }
  if (error.code === 'weak_password') {
    return 'La contraseña es demasiado débil. Usa una más segura.';
  }
  if (error.code === 'otp_expired') {
    return 'El código es incorrecto o ya expiró. Solicita uno nuevo.';
  }
  return error.message ?? 'Ocurrió un error inesperado.';
}
