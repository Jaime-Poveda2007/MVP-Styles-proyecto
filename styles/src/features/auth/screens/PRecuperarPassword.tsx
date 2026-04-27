import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    if (!email.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
    );

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // Mostramos confirmación en pantalla en lugar de navegar
    setEnviado(true);
  };

  // ── Vista de confirmación ────────────────────────────────────────────────
  if (enviado) {
    return (
      <View>
        <Text>Revisa tu correo</Text>
        <Text>
          Si el correo {email} está registrado, recibirás un enlace para
          restablecer tu contraseña.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <View>
      <Text>¿Olvidaste tu contraseña?</Text>
      <Text>
        Ingresa tu correo y te enviaremos un enlace para restablecerla.
      </Text>

      <Text>Correo electrónico</Text>
      <TextInput
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleEnviar}
      />

      <TouchableOpacity onPress={handleEnviar} disabled={loading}>
        {loading
          ? <ActivityIndicator />
          : <Text>Enviar enlace</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
}