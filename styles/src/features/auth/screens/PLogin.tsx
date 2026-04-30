import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

// ─── Constantes de bloqueo (RF-U01) ──────────────────────────────────────────

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos en milisegundos
const KEY_INTENTOS = 'login_intentos';
const KEY_BLOQUEO = 'login_bloqueo_timestamp';

// ─── Helpers de AsyncStorage ──────────────────────────────────────────────────

const getIntentos = async (): Promise<number> => {
  const val = await AsyncStorage.getItem(KEY_INTENTOS);
  return val ? parseInt(val, 10) : 0;
};

const getTimestampBloqueo = async (): Promise<number> => {
  const val = await AsyncStorage.getItem(KEY_BLOQUEO);
  return val ? parseInt(val, 10) : 0;
};

const resetBloqueo = async () => {
  await AsyncStorage.removeItem(KEY_INTENTOS);
  await AsyncStorage.removeItem(KEY_BLOQUEO);
};

// Devuelve los minutos que faltan para desbloquear, o 0 si ya pasaron
const minutosRestantes = (timestamp: number): number => {
  const diff = BLOQUEO_MS - (Date.now() - timestamp);
  return diff > 0 ? Math.ceil(diff / 60000) : 0;
};

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: Props) {
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
      // ── Verificar si la cuenta está bloqueada ────────────────────────────
      const timestamp = await getTimestampBloqueo();

      if (timestamp) {
        const mins = minutosRestantes(timestamp);
        if (mins > 0) {
          Alert.alert(
            'Cuenta bloqueada',
            `Demasiados intentos fallidos. Intenta de nuevo en ${mins} minuto${mins > 1 ? 's' : ''}.`,
          );
          return;
        }
        // Ya pasaron los 15 minutos: resetear conteo
        await resetBloqueo();
      }

      // ── Intento de login ─────────────────────────────────────────────────
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Contar intento fallido
        const intentos = (await getIntentos()) + 1;
        await AsyncStorage.setItem(KEY_INTENTOS, String(intentos));

        if (intentos >= MAX_INTENTOS) {
          // Guardar timestamp del momento del bloqueo
          await AsyncStorage.setItem(KEY_BLOQUEO, String(Date.now()));
          Alert.alert(
            'Cuenta bloqueada',
            'Alcanzaste el límite de 5 intentos fallidos. Intenta de nuevo en 15 minutos.',
          );
          return;
        }

        const restantes = MAX_INTENTOS - intentos;
        Alert.alert(
          'Credenciales incorrectas',
          `Correo o contraseña incorrectos. Te quedan ${restantes} intento${restantes > 1 ? 's' : ''}.`,
        );
        return;
      }

      // ── Login exitoso: limpiar conteo ────────────────────────────────────
      await resetBloqueo();

      // La navegación al Home la maneja App.tsx al detectar la sesión activa.
      // No es necesario navegar manualmente aquí.

    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text>styles</Text>
      <Text>Inicia sesión</Text>

      <Text>Correo electrónico</Text>
      <TextInput
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text>Contraseña</Text>
      <View>
        <TextInput
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!verPass}
          autoCapitalize="none"
          onSubmitEditing={handleLogin}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={() => setVerPass(v => !v)}>
          <Text>{verPass ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Recuperar contraseña — se activa en la siguiente pantalla */}
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator />
          : <Text>Iniciar sesión</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>
    </View>
  );
}