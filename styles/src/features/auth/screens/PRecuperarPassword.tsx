// src/features/auth/screens/PRecuperarPassword.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';
import { C, R } from '../../../shared/theme';
import { mostrarAlerta } from '../../../lib/alerta';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    if (!email.trim()) { mostrarAlerta('Campo requerido', 'Ingresa tu correo electrónico.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    if (error) { mostrarAlerta('Error', error.message); return; }
    setEnviado(true);
  };

  if (enviado) {
    return (
      <SafeAreaView style={p.safe}>
        <View style={p.container}>
          <View style={p.iconWrap}><Text style={p.iconEmoji}>🔑</Text></View>
          <Text style={p.eyebrow}>Listo</Text>
          <Text style={p.titulo}>Correo enviado</Text>
          <Text style={p.subtitulo}>
            Si <Text style={{ color: C.ink, fontWeight: '600' }}>{email}</Text> está registrado, recibirás un enlace para restablecer tu contraseña.
          </Text>
          <Text style={p.hint}>Revisa tu bandeja de entrada y la carpeta de spam.</Text>
          <TouchableOpacity style={p.btnPrimary} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={p.btnPrimaryText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={p.safe}>
      <View style={p.container}>

        <TouchableOpacity style={p.backBtn} onPress={() => navigation.goBack()}>
          <Text style={p.backText}>← Volver</Text>
        </TouchableOpacity>

        <View style={p.iconWrap}><Text style={p.iconEmoji}>🔒</Text></View>
        <Text style={p.eyebrow}>Recuperar acceso</Text>
        <Text style={p.titulo}>¿Olvidaste tu contraseña?</Text>
        <Text style={p.subtitulo}>
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </Text>

        <View style={p.campo}>
          <Text style={p.label}>Correo electrónico</Text>
          <TextInput
            style={p.input}
            placeholder="tu@correo.com"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleEnviar}
          />
        </View>

        <TouchableOpacity style={[p.btnPrimary, loading && p.btnDisabled]} onPress={handleEnviar} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={C.white} /> : <Text style={p.btnPrimaryText}>Enviar enlace</Text>}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const p = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.white },
  container:      { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  backBtn:        { paddingVertical: 8, marginBottom: 32 },
  backText:       { fontSize: 14, color: C.earth, fontWeight: '500' },
  iconWrap:       { width: 72, height: 72, borderRadius: 20, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  iconEmoji:      { fontSize: 32 },
  eyebrow:        { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 6 },
  titulo:         { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 10 },
  subtitulo:      { fontSize: 15, color: C.muted, lineHeight: 22, marginBottom: 32 },
  hint:           { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 32, textAlign: 'center' },
  campo:          { gap: 6, marginBottom: 8 },
  label:          { fontSize: 13, fontWeight: '500', color: C.muted },
  input:          { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.ink },
  btnPrimary:     { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, alignItems: 'center', marginTop: 24, shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:    { opacity: 0.65 },
});