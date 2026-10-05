// src/features/auth/screens/PEmailConfirmacion.tsx
//
// Verificación del correo con código de 8 dígitos (RF-U01).
// Sirve para usuarios y para marcas (ambos usan supabase.auth.signUp).
//
// Al verificar con éxito, supabase crea la sesión y el listener
// onAuthStateChange de App.tsx hace el resto (crear/leer el perfil y
// mandar al onboarding o al panel de marca), igual que en el login.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';
import { C, R } from '../../../shared/theme';
import { mostrarAlerta } from '../../../lib/alerta';
import CampoCodigo from '../../../shared/components/CampoCodigo';
import { LONGITUD_OTP, SEGUNDOS_REENVIO, mensajeErrorOtp } from '../../../lib/authFlow';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailConfirmation'>;

export default function EmailConfirmationScreen({ route, navigation }: Props) {
  const { email, enviarCodigo } = route.params ?? ({} as { email?: string; enviarCodigo?: boolean });
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  // El código ya se envió al registrarse, así que arrancamos con espera.
  const [espera, setEspera] = useState(SEGUNDOS_REENVIO);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(e => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  // Si llegamos desde un login con correo sin confirmar, enviamos un código nuevo.
  useEffect(() => {
    if (enviarCodigo) reenviar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reenviar = async (silencioso = false) => {
    if (!email) return;
    setReenviando(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setReenviando(false);
    if (error) { mostrarAlerta('No se pudo enviar', mensajeErrorOtp(error)); return; }
    setEspera(SEGUNDOS_REENVIO);
    if (!silencioso) mostrarAlerta('Código enviado', 'Revisa tu bandeja de entrada y la carpeta de spam.');
  };

  const verificar = async () => {
    if (!email || codigo.length !== LONGITUD_OTP || verificando) return;
    setVerificando(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'signup' });
    setVerificando(false);
    if (error) {
      mostrarAlerta('Código incorrecto', mensajeErrorOtp({ ...error, code: error.code ?? 'otp_expired' }));
      return;
    }
    // Éxito: onAuthStateChange (App.tsx) toma la sesión y cambia de pantalla.
  };

  const listo = codigo.length === LONGITUD_OTP;

  return (
    <SafeAreaView style={e.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={e.container}>

          <View style={e.iconWrap}>
            <Text style={e.iconEmoji}>✉️</Text>
          </View>

          <Text style={e.eyebrow}>Casi listo</Text>
          <Text style={e.titulo}>Revisa tu correo</Text>
          <Text style={e.subtitulo}>Enviamos un código de {LONGITUD_OTP} dígitos a</Text>
          <Text style={e.email}>{email ?? '—'}</Text>
          <Text style={e.hint}>Si no lo ves, revisa la carpeta de spam.</Text>

          <CampoCodigo value={codigo} onChange={setCodigo} onSubmit={verificar} autoFocus />

          <TouchableOpacity
            style={[e.btnPrimary, (!listo || verificando) && e.btnDisabled]}
            onPress={verificar}
            disabled={!listo || verificando}
            activeOpacity={0.85}
          >
            {verificando ? <ActivityIndicator color={C.white} /> : <Text style={e.btnPrimaryText}>Verificar</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={e.btnGhost}
            onPress={() => reenviar()}
            disabled={reenviando || espera > 0 || !email}
          >
            <Text style={[e.btnGhostText, (reenviando || espera > 0) && { opacity: 0.5 }]}>
              {espera > 0 ? `Reenviar código en ${espera}s` : 'Reenviar código'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={e.btnGhost} onPress={() => navigation.navigate('Login')}>
            <Text style={e.btnGhostText}>← Volver al inicio de sesión</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const e = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.white },
  container:      { flex: 1, paddingHorizontal: 32, paddingTop: 48, alignItems: 'center' },
  iconWrap:       { width: 80, height: 80, borderRadius: 24, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  iconEmoji:      { fontSize: 36 },
  eyebrow:        { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 8 },
  titulo:         { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' },
  subtitulo:      { fontSize: 15, color: C.muted, textAlign: 'center', marginBottom: 4 },
  email:          { fontSize: 15, fontWeight: '600', color: C.ink, textAlign: 'center', marginBottom: 8 },
  hint:           { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  btnPrimary:     { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, paddingHorizontal: 32, alignItems: 'center', width: '100%', marginTop: 24, shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:    { opacity: 0.5 },
  btnGhost:       { marginTop: 14, paddingVertical: 10 },
  btnGhostText:   { fontSize: 14, color: C.earth, fontWeight: '500' },
});
