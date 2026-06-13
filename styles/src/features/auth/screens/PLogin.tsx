// src/features/auth/screens/PLogin.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const KEY_INTENTOS = 'login_intentos';
const KEY_BLOQUEO = 'login_bloqueo_timestamp';

const getIntentos = async () => {
  const val = await AsyncStorage.getItem(KEY_INTENTOS);
  return val ? parseInt(val, 10) : 0;
};
const getTimestampBloqueo = async () => {
  const val = await AsyncStorage.getItem(KEY_BLOQUEO);
  return val ? parseInt(val, 10) : 0;
};
const resetBloqueo = async () => {
  await AsyncStorage.removeItem(KEY_INTENTOS);
  await AsyncStorage.removeItem(KEY_BLOQUEO);
};
const minutosRestantes = (timestamp: number) => {
  const diff = BLOQUEO_MS - (Date.now() - timestamp);
  return diff > 0 ? Math.ceil(diff / 60000) : 0;
};

export default function LoginScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const timestamp = await getTimestampBloqueo();
      if (timestamp) {
        const mins = minutosRestantes(timestamp);
        if (mins > 0) {
          Alert.alert('Cuenta bloqueada', `Intenta de nuevo en ${mins} minuto${mins > 1 ? 's' : ''}.`);
          return;
        }
        await resetBloqueo();
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const intentos = (await getIntentos()) + 1;
        await AsyncStorage.setItem(KEY_INTENTOS, String(intentos));
        if (intentos >= MAX_INTENTOS) {
          await AsyncStorage.setItem(KEY_BLOQUEO, String(Date.now()));
          Alert.alert('Cuenta bloqueada', 'Alcanzaste el límite de 5 intentos. Intenta en 15 minutos.');
          return;
        }
        const restantes = MAX_INTENTOS - intentos;
        Alert.alert('Credenciales incorrectas', `Te quedan ${restantes} intento${restantes > 1 ? 's' : ''}.`);
        return;
      }

      await resetBloqueo();

      if (data.user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('onboarding_completo')
          .eq('id', data.user.id)
          .single();

        if (usuario?.onboarding_completo) {
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
    <View style={styles.container}>
      <Text style={styles.titulo}>Inicia sesión</Text>

      <View style={styles.campo}>
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.inputFila}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Tu contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!verPass}
            autoCapitalize="none"
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={() => setVerPass(v => !v)} style={styles.ojito}>
            <Text>{verPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.enlace}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.boton} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Iniciar sesión</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.enlace}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  titulo:     { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  campo:      { gap: 6 },
  label:      { fontSize: 14, color: '#555' },
  input:      { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 15 },
  inputFila:  { flexDirection: 'row', alignItems: 'center' },
  ojito:      { padding: 12 },
  boton:      { backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  enlace:     { color: '#555', textAlign: 'center', fontSize: 14 },
});