import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailConfirmation'>;

export default function EmailConfirmationScreen({ route, navigation }: Props) {
  const { email } = route.params ?? {};  // ✅ Fix aquí
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    if (!email) return; // ✅ guarda extra por si acaso
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada.');
    }
  }

  return (
    <View>
      <Text>Revisa tu correo</Text>
      <Text>
        Enviamos un enlace de confirmación a{' '}
        <Text>{email ?? '—'}</Text>
      </Text>
      <Text>
        Abre el enlace en tu correo para activar tu cuenta. Si no lo ves,
        revisa la carpeta de spam.
      </Text>

      <TouchableOpacity onPress={handleResend} disabled={loading || !email}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text>Reenviar correo</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}