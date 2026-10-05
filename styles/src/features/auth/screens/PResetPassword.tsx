// src/features/auth/screens/PResetPassword.tsx
//
// Segundo paso de "¿Olvidaste tu contraseña?": la persona escribe el
// código de 8 dígitos que llegó al correo y define su nueva contraseña.
//
// Flujo: verifyOtp({ type: 'recovery' }) crea una sesión temporal →
// updateUser({ password }) cambia la contraseña → signOut() → Login.
//
// Mientras dura el flujo, la bandera de authFlow.ts hace que App.tsx
// ignore la sesión temporal (si no, mandaría al Home sin cambiar nada).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';
import { C, R } from '../../../shared/theme';
import { mostrarAlerta } from '../../../lib/alerta';
import CampoCodigo from '../../../shared/components/CampoCodigo';
import {
  LONGITUD_OTP, SEGUNDOS_REENVIO, mensajeErrorOtp, validarPassword,
  iniciarRecuperacion, terminarRecuperacion,
} from '../../../lib/authFlow';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [errorPass, setErrorPass] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [espera, setEspera] = useState(SEGUNDOS_REENVIO);

  // El código se consume al verificarlo. Si luego falla el cambio de
  // contraseña (p. ej. igual a la anterior), la persona puede corregirla
  // sin pedir otro código mientras la sesión temporal siga viva.
  const verificado = useRef(false);
  const completado = useRef(false);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(x => x - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  // Si se sale de la pantalla a medias, no dejar una sesión abierta ni la bandera puesta.
  useEffect(() => () => {
    terminarRecuperacion();
    if (verificado.current && !completado.current) supabase.auth.signOut();
  }, []);

  const reenviar = async () => {
    setReenviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setReenviando(false);
    if (error) { mostrarAlerta('No se pudo enviar', mensajeErrorOtp(error)); return; }
    setEspera(SEGUNDOS_REENVIO);
    mostrarAlerta('Código enviado', 'Revisa tu bandeja de entrada y la carpeta de spam.');
  };

  const handleCambiar = async () => {
    if (loading) return;
    if (!verificado.current && codigo.length !== LONGITUD_OTP) {
      mostrarAlerta('Código incompleto', `Ingresa los ${LONGITUD_OTP} dígitos que llegaron a tu correo.`);
      return;
    }
    const ePass = validarPassword(password);
    if (ePass) { setErrorPass(ePass); return; }
    if (password !== confirmar) { setErrorPass('Las contraseñas no coinciden'); return; }
    setErrorPass(undefined);

    setLoading(true);
    iniciarRecuperacion();
    try {
      if (!verificado.current) {
        const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'recovery' });
        if (error) {
          terminarRecuperacion();
          mostrarAlerta('Código incorrecto', mensajeErrorOtp({ ...error, code: error.code ?? 'otp_expired' }));
          return;
        }
        verificado.current = true;
      }

      const { error: errUpdate } = await supabase.auth.updateUser({ password });
      if (errUpdate) {
        // Sesión temporal y bandera siguen activas para permitir reintentar.
        mostrarAlerta('No se pudo cambiar la contraseña', mensajeErrorOtp(errUpdate));
        return;
      }

      completado.current = true;
      await supabase.auth.signOut();
      terminarRecuperacion();
      mostrarAlerta('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.');
      navigation.navigate('Login');
    } catch (err: any) {
      terminarRecuperacion();
      mostrarAlerta('Error', err.message ?? 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={p.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={p.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={p.backBtn} onPress={() => navigation.goBack()}>
            <Text style={p.backText}>← Volver</Text>
          </TouchableOpacity>

          <View style={p.iconWrap}><Text style={p.iconEmoji}>🔑</Text></View>
          <Text style={p.eyebrow}>Recuperar acceso</Text>
          <Text style={p.titulo}>Crea una nueva contraseña</Text>
          <Text style={p.subtitulo}>
            Si <Text style={{ color: C.ink, fontWeight: '600' }}>{email}</Text> está registrado, te enviamos un código de {LONGITUD_OTP} dígitos. Revisa también el spam.
          </Text>

          {!verificado.current && (
            <View style={p.campo}>
              <Text style={p.label}>Código de verificación</Text>
              <CampoCodigo value={codigo} onChange={setCodigo} autoFocus />
            </View>
          )}

          <View style={p.campo}>
            <Text style={p.label}>Nueva contraseña</Text>
            <View style={p.inputRow}>
              <TextInput
                style={p.inputFlex}
                placeholder="Mín. 8 caracteres, una mayúscula y un número"
                placeholderTextColor={C.muted}
                value={password}
                onChangeText={t => { setPassword(t); if (errorPass) setErrorPass(undefined); }}
                secureTextEntry={!verPass}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={p.eyeBtn} onPress={() => setVerPass(v => !v)}>
                {verPass ? <EyeOff size={20} color={C.muted} strokeWidth={2} /> : <Eye size={20} color={C.muted} strokeWidth={2} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={p.campo}>
            <Text style={p.label}>Confirmar contraseña</Text>
            <View style={p.inputRow}>
              <TextInput
                style={p.inputFlex}
                placeholder="Repite la contraseña"
                placeholderTextColor={C.muted}
                value={confirmar}
                onChangeText={t => { setConfirmar(t); if (errorPass) setErrorPass(undefined); }}
                secureTextEntry={!verPass}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleCambiar}
              />
            </View>
            {errorPass ? <Text style={p.errorText}>{errorPass}</Text> : null}
          </View>

          <TouchableOpacity style={[p.btnPrimary, loading && p.btnDisabled]} onPress={handleCambiar} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={C.white} /> : <Text style={p.btnPrimaryText}>Cambiar contraseña</Text>}
          </TouchableOpacity>

          {!verificado.current && (
            <TouchableOpacity style={p.btnGhost} onPress={reenviar} disabled={reenviando || espera > 0}>
              <Text style={[p.btnGhostText, (reenviando || espera > 0) && { opacity: 0.5 }]}>
                {espera > 0 ? `Reenviar código en ${espera}s` : 'Reenviar código'}
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const p = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.white },
  scroll:         { flexGrow: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 },
  backBtn:        { paddingVertical: 8, marginBottom: 24 },
  backText:       { fontSize: 14, color: C.earth, fontWeight: '500' },
  iconWrap:       { width: 72, height: 72, borderRadius: 20, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconEmoji:      { fontSize: 32 },
  eyebrow:        { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 6 },
  titulo:         { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 10 },
  subtitulo:      { fontSize: 15, color: C.muted, lineHeight: 22, marginBottom: 24 },
  campo:          { gap: 6, marginBottom: 16 },
  label:          { fontSize: 13, fontWeight: '500', color: C.muted },
  inputRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input },
  inputFlex:      { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.ink },
  eyeBtn:         { paddingHorizontal: 14, paddingVertical: 14 },
  errorText:      { fontSize: 12, color: C.error },
  btnPrimary:     { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, alignItems: 'center', marginTop: 12, shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:    { opacity: 0.65 },
  btnGhost:       { marginTop: 16, paddingVertical: 10, alignItems: 'center' },
  btnGhostText:   { fontSize: 14, color: C.earth, fontWeight: '500' },
});
