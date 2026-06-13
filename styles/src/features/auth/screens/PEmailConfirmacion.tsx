// src/features/auth/screens/PEmailConfirmacion.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';
import { C, R } from '../../../shared/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailConfirmation'>;

export default function EmailConfirmationScreen({ route, navigation }: Props) {
  const { email } = route.params ?? {};
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    error
      ? Alert.alert('Error', error.message)
      : Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada.');
  };

  return (
    <SafeAreaView style={e.safe}>
      <View style={e.container}>

        {/* Ícono central */}
        <View style={e.iconWrap}>
          <Text style={e.iconEmoji}>✉️</Text>
        </View>

        <Text style={e.eyebrow}>Casi listo</Text>
        <Text style={e.titulo}>Revisa tu correo</Text>
        <Text style={e.subtitulo}>
          Enviamos un enlace de confirmación a
        </Text>
        <Text style={e.email}>{email ?? '—'}</Text>
        <Text style={e.hint}>
          Abre el enlace para activar tu cuenta.{'\n'}Si no lo ves, revisa la carpeta de spam.
        </Text>

        <TouchableOpacity
          style={[e.btnPrimary, (!email || loading) && e.btnDisabled]}
          onPress={handleResend}
          disabled={loading || !email}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={e.btnPrimaryText}>Reenviar correo</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={e.btnGhost} onPress={() => navigation.navigate('Login')}>
          <Text style={e.btnGhostText}>← Volver al inicio de sesión</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const e = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.white },
  container:      { flex: 1, paddingHorizontal: 32, paddingTop: 64, alignItems: 'center' },
  iconWrap:       { width: 80, height: 80, borderRadius: 24, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  iconEmoji:      { fontSize: 36 },
  eyebrow:        { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 8 },
  titulo:         { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' },
  subtitulo:      { fontSize: 15, color: C.muted, textAlign: 'center', marginBottom: 4 },
  email:          { fontSize: 15, fontWeight: '600', color: C.ink, textAlign: 'center', marginBottom: 12 },
  hint:           { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  btnPrimary:     { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, paddingHorizontal: 32, alignItems: 'center', width: '100%', shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:    { opacity: 0.5 },
  btnGhost:       { marginTop: 20, paddingVertical: 12 },
  btnGhostText:   { fontSize: 14, color: C.earth, fontWeight: '500' },
});