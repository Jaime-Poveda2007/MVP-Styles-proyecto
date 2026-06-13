// src/features/auth/screens/PLogin.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';
import { C, R } from '../../../shared/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const MAX_INTENTOS = 5;
const BLOQUEO_MS   = 15 * 60 * 1000;
const KEY_INTENTOS = 'login_intentos';
const KEY_BLOQUEO  = 'login_bloqueo_timestamp';

const getIntentos         = async () => parseInt((await AsyncStorage.getItem(KEY_INTENTOS)) ?? '0', 10);
const getTimestampBloqueo = async () => parseInt((await AsyncStorage.getItem(KEY_BLOQUEO))  ?? '0', 10);
const resetBloqueo        = async () => { await AsyncStorage.multiRemove([KEY_INTENTOS, KEY_BLOQUEO]); };
const minutosRestantes    = (ts: number) => Math.max(0, Math.ceil((BLOQUEO_MS - (Date.now() - ts)) / 60000));

export default function LoginScreen({ navigation, route }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [verPass,  setVerPass]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const ts = await getTimestampBloqueo();
      if (ts) {
        const mins = minutosRestantes(ts);
        if (mins > 0) {
          Alert.alert('Cuenta bloqueada', `Intenta de nuevo en ${mins} minuto${mins > 1 ? 's' : ''}.`);
          return;
        }
        await resetBloqueo();
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });

      if (error) {
        const intentos = (await getIntentos()) + 1;
        await AsyncStorage.setItem(KEY_INTENTOS, String(intentos));
        if (intentos >= MAX_INTENTOS) {
          await AsyncStorage.setItem(KEY_BLOQUEO, String(Date.now()));
          Alert.alert('Cuenta bloqueada', 'Alcanzaste el límite de 5 intentos. Intenta en 15 minutos.');
          return;
        }
        Alert.alert('Credenciales incorrectas', `Te quedan ${MAX_INTENTOS - intentos} intento${MAX_INTENTOS - intentos > 1 ? 's' : ''}.`);
        return;
      }

      await resetBloqueo();
      if (data.user) {
        const { data: perfil } = await supabase
          .from('usuarios').select('onboarding_completo').eq('id', data.user.id).single();
        if (perfil?.onboarding_completo) {
          route.params?.onLoginExitoso?.();
        } else {
          navigation.navigate('OnboardingEstilo', {
            userId: data.user.id,
            onComplete: route.params?.onLoginExitoso ?? (() => {}),
          });
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.wordmark}>styles<Text style={s.dot}>.</Text></Text>
          </View>

          {/* Títulos */}
          <View style={s.titlesWrap}>
            <Text style={s.eyebrow}>Bienvenido de vuelta</Text>
            <Text style={s.titulo}>Inicia sesión</Text>
            <Text style={s.subtitulo}>Explora moda local colombiana</Text>
          </View>

          {/* Campos */}
          <View style={s.form}>
            <View style={s.campo}>
              <Text style={s.label}>Correo electrónico</Text>
              <TextInput
                style={s.input}
                placeholder="tu@correo.com"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={s.campo}>
              <Text style={s.label}>Contraseña</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Tu contraseña"
                  placeholderTextColor={C.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!verPass}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setVerPass(v => !v)}>
                  <Text style={s.eyeIcon}>{verPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={s.forgotWrap} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={s.forgot}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity style={[s.btnPrimary, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnPrimaryText}>Iniciar sesión</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.footerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.white },
  scroll:         { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header:         { paddingTop: 32, paddingBottom: 8, alignItems: 'center' },
  wordmark:       { fontSize: 30, fontWeight: '800', letterSpacing: 1, color: C.ink },
  dot:            { color: C.earth },
  titlesWrap:     { paddingTop: 32, paddingBottom: 28 },
  eyebrow:        { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 6 },
  titulo:         { fontSize: 30, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 6 },
  subtitulo:      { fontSize: 15, color: C.muted },
  form:           { gap: 16, marginBottom: 8 },
  campo:          { gap: 6 },
  label:          { fontSize: 13, fontWeight: '500', color: C.muted, letterSpacing: 0.2 },
  input:          { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.ink, marginBottom: 0 },
  inputRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input },
  eyeBtn:         { paddingHorizontal: 14, paddingVertical: 14 },
  eyeIcon:        { fontSize: 16 },
  forgotWrap:     { alignItems: 'flex-end', marginTop: -4 },
  forgot:         { fontSize: 13, color: C.earth, fontWeight: '500' },
  btnPrimary:     { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, alignItems: 'center', marginTop: 24, shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:    { opacity: 0.65 },
  footer:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText:     { fontSize: 14, color: C.muted },
  footerLink:     { fontSize: 14, color: C.earth, fontWeight: '600' },
});