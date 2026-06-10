// src/features/auth/screens/PRegistro.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FormData {
  nombre: string;
  email: string;
  password: string;
  confirmPassword: string;
  fechaNacimiento: string;
}

interface FormErrors {
  nombre?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  fechaNacimiento?: string;
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

const validarPassword = (password: string): string | undefined => {
  if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe incluir al menos una letra mayúscula';
  if (!/[0-9]/.test(password)) return 'Debe incluir al menos un número';
  return undefined;
};

const validarEmail = (email: string): string | undefined => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return 'Ingresa un correo electrónico válido';
  return undefined;
};

const validarFechaNacimiento = (fecha: string): string | undefined => {
  const match = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return 'Formato esperado: DD/MM/AAAA';

  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10) - 1;
  const anio = parseInt(match[3], 10);
  const fechaObj = new Date(anio, mes, dia);

  if (
    fechaObj.getFullYear() !== anio ||
    fechaObj.getMonth() !== mes ||
    fechaObj.getDate() !== dia
  ) {
    return 'Fecha inválida';
  }

  const hoy = new Date();
  const edad =
    hoy.getFullYear() - anio - (hoy < new Date(hoy.getFullYear(), mes, dia) ? 1 : 0);
  if (edad < 13) return 'Debes tener al menos 13 años para registrarte';

  return undefined;
};

const toISO = (fecha: string): string => {
  const [d, m, y] = fecha.split('/');
  return `${y}-${m}-${d}`;
};

const formatearFecha = (nuevo: string, previo: string): string => {
  if (nuevo.length < previo.length) return nuevo;
  const nums = nuevo.replace(/\D/g, '');
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4, 8)}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text>{label}</Text>
      {children}
    </View>
  );
}

function Error({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <Text>{msg}</Text>;
}

function Requisito({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <View>
      <Text>{ok ? '✓' : '○'}</Text>
      <Text>{texto}</Text>
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState<FormData>({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    fechaNacimiento: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const [verConfirm, setVerConfirm] = useState(false);

  const set = (campo: keyof FormData, valor: string) => {
    const val =
      campo === 'fechaNacimiento'
        ? formatearFecha(valor, form.fechaNacimiento)
        : valor;
    setForm(prev => ({ ...prev, [campo]: val }));
    if (errors[campo]) setErrors(prev => ({ ...prev, [campo]: undefined }));
  };

  const validar = (): boolean => {
    const e: FormErrors = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres';
    const eEmail = validarEmail(form.email);
    if (eEmail) e.email = eEmail;
    const ePass = validarPassword(form.password);
    if (ePass) e.password = ePass;
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Las contraseñas no coinciden';
    const eFecha = validarFechaNacimiento(form.fechaNacimiento);
    if (eFecha) e.fechaNacimiento = eFecha;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validar()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            nombre: form.nombre.trim(),
            fecha_nacimiento: toISO(form.fechaNacimiento),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setErrors(prev => ({ ...prev, email: 'Este correo ya está registrado' }));
          return;
        }
        throw error;
      }

      if (data.user) {
        // Si la confirmación de email está desactivada en Supabase,
        // data.session viene con sesión activa → ir directo al onboarding.
        // Si está activada, data.session es null → ir a EmailConfirmation.
        if (data.session) {
          navigation.navigate('OnboardingEstilo', { userId: data.user.id });
        } else {
          navigation.navigate('EmailConfirmation', {
            email: form.email.trim().toLowerCase(),
          });
        }
      }
    } catch (err: any) {
      Alert.alert(
        'Error al registrarse',
        err.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  const fortaleza = (() => {
    const p = form.password;
    if (!p) return { nivel: 0, label: '' };
    let pts = 0;
    if (p.length >= 8) pts++;
    if (/[A-Z]/.test(p)) pts++;
    if (/[0-9]/.test(p)) pts++;
    if (/[^A-Za-z0-9]/.test(p)) pts++;
    if (pts <= 1) return { nivel: 1, label: 'Débil' };
    if (pts === 2) return { nivel: 2, label: 'Regular' };
    if (pts === 3) return { nivel: 3, label: 'Buena' };
    return { nivel: 4, label: 'Fuerte' };
  })();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text>styles</Text>
        <Text>Crea tu cuenta</Text>
        <Text>Únete a la comunidad de moda local</Text>

        <Campo label="Nombre">
          <TextInput
            placeholder="¿Cómo te llamas?"
            value={form.nombre}
            onChangeText={v => set('nombre', v)}
            autoCapitalize="words"
            returnKeyType="next"
            maxLength={50}
          />
          <Error msg={errors.nombre} />
        </Campo>

        <Campo label="Correo electrónico">
          <TextInput
            placeholder="tu@correo.com"
            value={form.email}
            onChangeText={v => set('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <Error msg={errors.email} />
        </Campo>

        <Campo label="Fecha de nacimiento">
          <TextInput
            placeholder="DD/MM/AAAA"
            value={form.fechaNacimiento}
            onChangeText={v => set('fechaNacimiento', v)}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="next"
          />
          <Error msg={errors.fechaNacimiento} />
        </Campo>

        <Campo label="Contraseña">
          <View>
            <TextInput
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChangeText={v => set('password', v)}
              secureTextEntry={!verPass}
              autoCapitalize="none"
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setVerPass(v => !v)}>
              <Text>{verPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {form.password.length > 0 && <Text>{fortaleza.label}</Text>}
          <Error msg={errors.password} />
          {form.password.length > 0 && (
            <View>
              <Requisito ok={form.password.length >= 8} texto="Mínimo 8 caracteres" />
              <Requisito ok={/[A-Z]/.test(form.password)} texto="Una letra mayúscula" />
              <Requisito ok={/[0-9]/.test(form.password)} texto="Un número" />
            </View>
          )}
        </Campo>

        <Campo label="Confirmar contraseña">
          <View>
            <TextInput
              placeholder="Repite tu contraseña"
              value={form.confirmPassword}
              onChangeText={v => set('confirmPassword', v)}
              secureTextEntry={!verConfirm}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity onPress={() => setVerConfirm(v => !v)}>
              <Text>{verConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          <Error msg={errors.confirmPassword} />
        </Campo>

        <TouchableOpacity onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator /> : <Text>Crear cuenta</Text>}
        </TouchableOpacity>

        <Text>
          Al registrarte aceptas nuestros{' '}
          <Text>Términos de uso</Text> y{' '}
          <Text>Política de privacidad</Text>
        </Text>

        <View>
          <Text>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text>Inicia sesión</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
