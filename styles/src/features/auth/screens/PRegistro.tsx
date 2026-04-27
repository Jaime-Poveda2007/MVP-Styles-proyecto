// src/features/auth/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FormData {
  nombre: string;
  email: string;
  password: string;
  confirmPassword: string;
  fechaNacimiento: string; // formato de entrada: DD/MM/YYYY
}

interface FormErrors {
  nombre?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  fechaNacimiento?: string;
}

// ─── Validaciones ─────────────────────────────────────────────────────────────

/**
 * RF-U01: valida que la contraseña tenga mínimo 8 chars, una mayúscula y un número.
 */
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

/**
 * Valida DD/MM/YYYY y que el usuario tenga al menos 13 años.
 */
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
  const edad = hoy.getFullYear() - anio - (
    hoy < new Date(hoy.getFullYear(), mes, dia) ? 1 : 0
  );
  if (edad < 13) return 'Debes tener al menos 13 años para registrarte';

  return undefined;
};

/** Convierte DD/MM/YYYY → YYYY-MM-DD para PostgreSQL */
const toISO = (fecha: string): string => {
  const [d, m, y] = fecha.split('/');
  return `${y}-${m}-${d}`;
};

/**
 * Formatea automáticamente el input de fecha mientras el usuario escribe.
 * Inserta '/' en las posiciones 2 y 5 sin bloquear el borrado.
 */
const formatearFecha = (nuevo: string, previo: string): string => {
  if (nuevo.length < previo.length) return nuevo; // el usuario está borrando
  const nums = nuevo.replace(/\D/g, '');
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4, 8)}`;
};

// ─── Subcomponente: ítem de requisito de contraseña ──────────────────────────

function Requisito({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <View style={styles.reqRow}>
      <Text style={[styles.reqIcon, ok && styles.reqOk]}>{ok ? '✓' : '○'}</Text>
      <Text style={[styles.reqTexto, ok && styles.reqTextoOk]}>{texto}</Text>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../NavDeAuntenticacion';

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

  // ── Actualizar campo ───────────────────────────────────────────────────────

  const set = (campo: keyof FormData, valor: string) => {
    const val =
      campo === 'fechaNacimiento'
        ? formatearFecha(valor, form.fechaNacimiento)
        : valor;

    setForm(prev => ({ ...prev, [campo]: val }));
    // Limpia el error del campo en cuanto el usuario empieza a corregirlo
    if (errors[campo]) setErrors(prev => ({ ...prev, [campo]: undefined }));
  };

  // ── Validar formulario completo ─────────────────────────────────────────────

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

  // ── Registro en Supabase ────────────────────────────────────────────────────

  const handleRegister = async () => {
    if (!validar()) return;
    setLoading(true);

    try {
      /**
       * supabase.auth.signUp:
       *   - Crea el usuario en auth.users
       *   - Envía el correo de confirmación automáticamente (RF-U01)
       *   - Los datos extra van a raw_user_meta_data; un trigger de DB
       *     los copia a la tabla pública "usuarios"
       */
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
        // RF-U01: email único — Supabase retorna este mensaje si el email ya existe
        if (error.message.includes('already registered')) {
          setErrors(prev => ({ ...prev, email: 'Este correo ya está registrado' }));
          return;
        }
        throw error;
      }

      if (data.user) {
        // Redirige a pantalla de "revisa tu correo"
        navigation.navigate('EmailConfirmation', {
          email: form.email.trim().toLowerCase(),
        });
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

  // ── Indicador de fortaleza ──────────────────────────────────────────────────

  const fortaleza = (() => {
    const p = form.password;
    if (!p) return { nivel: 0, label: '', color: '#E5E5E5' };
    let pts = 0;
    if (p.length >= 8) pts++;
    if (/[A-Z]/.test(p)) pts++;
    if (/[0-9]/.test(p)) pts++;
    if (/[^A-Za-z0-9]/.test(p)) pts++; // carácter especial: bonus
    if (pts <= 1) return { nivel: 1, label: 'Débil', color: '#FF4444' };
    if (pts === 2) return { nivel: 2, label: 'Regular', color: '#FF8C00' };
    if (pts === 3) return { nivel: 3, label: 'Buena', color: '#4CAF50' };
    return { nivel: 4, label: 'Fuerte', color: '#2196F3' };
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.logo}>styles</Text>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>Únete a la comunidad de moda local</Text>
        </View>

        {/* ── Campos ── */}
        <View style={styles.form}>

          {/* Nombre */}
          <Campo label="Nombre">
            <TextInput
              style={[styles.input, errors.nombre && styles.inputError]}
              placeholder="¿Cómo te llamas?"
              placeholderTextColor="#999"
              value={form.nombre}
              onChangeText={v => set('nombre', v)}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={50}
            />
            <Error msg={errors.nombre} />
          </Campo>

          {/* Email */}
          <Campo label="Correo electrónico">
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="tu@correo.com"
              placeholderTextColor="#999"
              value={form.email}
              onChangeText={v => set('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <Error msg={errors.email} />
          </Campo>

          {/* Fecha de nacimiento */}
          <Campo label="Fecha de nacimiento">
            <TextInput
              style={[styles.input, errors.fechaNacimiento && styles.inputError]}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#999"
              value={form.fechaNacimiento}
              onChangeText={v => set('fechaNacimiento', v)}
              keyboardType="numeric"
              maxLength={10}
              returnKeyType="next"
            />
            <Error msg={errors.fechaNacimiento} />
          </Campo>

          {/* Contraseña */}
          <Campo label="Contraseña">
            <View style={styles.passWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.passInput,
                  errors.password && styles.inputError,
                ]}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#999"
                value={form.password}
                onChangeText={v => set('password', v)}
                secureTextEntry={!verPass}
                autoCapitalize="none"
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.eye}
                onPress={() => setVerPass(v => !v)}
              >
                <Text style={styles.eyeIcon}>{verPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Barra de fortaleza */}
            {form.password.length > 0 && (
              <View style={styles.fortalezaRow}>
                <View style={styles.barras}>
                  {[1, 2, 3, 4].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.barra,
                        {
                          backgroundColor:
                            i <= fortaleza.nivel ? fortaleza.color : '#E5E5E5',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.fortalezaLabel, { color: fortaleza.color }]}>
                  {fortaleza.label}
                </Text>
              </View>
            )}

            <Error msg={errors.password} />

            {/* Requisitos en tiempo real */}
            {form.password.length > 0 && (
              <View style={styles.requisitos}>
                <Requisito ok={form.password.length >= 8} texto="Mínimo 8 caracteres" />
                <Requisito ok={/[A-Z]/.test(form.password)} texto="Una letra mayúscula" />
                <Requisito ok={/[0-9]/.test(form.password)} texto="Un número" />
              </View>
            )}
          </Campo>

          {/* Confirmar contraseña */}
          <Campo label="Confirmar contraseña">
            <View style={styles.passWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.passInput,
                  errors.confirmPassword && styles.inputError,
                ]}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#999"
                value={form.confirmPassword}
                onChangeText={v => set('confirmPassword', v)}
                secureTextEntry={!verConfirm}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity
                style={styles.eye}
                onPress={() => setVerConfirm(v => !v)}
              >
                <Text style={styles.eyeIcon}>{verConfirm ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <Error msg={errors.confirmPassword} />
          </Campo>

          {/* Botón principal */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          {/* Aviso legal */}
          <Text style={styles.legal}>
            Al registrarte aceptas nuestros{' '}
            <Text style={styles.legalLink}>Términos de uso</Text> y{' '}
            <Text style={styles.legalLink}>Política de privacidad</Text>
          </Text>

          {/* Ir a login */}
          <View style={styles.loginRow}>
            <Text style={styles.loginTxt}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Pequeños helpers de layout ───────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Error({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <Text style={styles.errorTxt}>{msg}</Text>;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Header
  header: { marginBottom: 32 },
  logo: {
    fontSize: 28,
    fontWeight: '800', 
    color: '#111',
    letterSpacing: -1,
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22 },

  // Form
  form: { flex: 1 },
  campo: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Inputs
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111',
  },
  inputError: { borderColor: '#FF4444', backgroundColor: '#FFF5F5' },
  errorTxt: { fontSize: 12, color: '#FF4444', marginTop: 6, marginLeft: 4 },

  // Contraseña
  passWrap: { position: 'relative' },
  passInput: { paddingRight: 50 },
  eye: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },

  // Fortaleza
  fortalezaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  barras: { flexDirection: 'row', gap: 4, flex: 1 },
  barra: { flex: 1, height: 4, borderRadius: 2 },
  fortalezaLabel: { fontSize: 12, fontWeight: '600', minWidth: 50, textAlign: 'right' },

  // Requisitos
  requisitos: { marginTop: 10, gap: 4 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqIcon: { fontSize: 13, color: '#CCC', width: 16 },
  reqOk: { color: '#4CAF50' },
  reqTexto: { fontSize: 12, color: '#999' },
  reqTextoOk: { color: '#4CAF50' },

  // Botón
  btn: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // Footer
  legal: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  legalLink: { color: '#555', textDecorationLine: 'underline' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginTxt: { fontSize: 14, color: '#666' },
  loginLink: { fontSize: 14, fontWeight: '700', color: '#111' },
});
