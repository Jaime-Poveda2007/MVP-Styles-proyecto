// src/features/auth/screens/PRegistro.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { AuthStackParamList } from '../NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';
import { asegurarPerfilUsuario } from '../../../lib/perfil';
import { C, R } from '../../../shared/theme';

interface FormData {
  nombre: string; email: string; password: string;
  confirmPassword: string; fechaNacimiento: string;
}
interface FormErrors {
  nombre?: string; email?: string; password?: string;
  confirmPassword?: string; fechaNacimiento?: string;
}

const validarPassword = (p: string) => {
  if (p.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(p)) return 'Debe incluir una mayúscula';
  if (!/[0-9]/.test(p)) return 'Debe incluir un número';
};
const validarEmail = (e: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? undefined : 'Correo inválido';

const validarFecha = (fecha: string) => {
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 'Formato: DD/MM/AAAA';
  const [, d, mo, y] = m.map(Number);
  const f = new Date(y, mo - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== mo - 1 || f.getDate() !== d) return 'Fecha inválida';
  const hoy = new Date();
  const edad = hoy.getFullYear() - y - (hoy < new Date(hoy.getFullYear(), mo - 1, d) ? 1 : 0);
  if (edad < 13) return 'Debes tener al menos 13 años';
};
const toISO = (f: string) => { const [d, m, y] = f.split('/'); return `${y}-${m}-${d}`; };
const formatFecha = (nuevo: string, previo: string) => {
  if (nuevo.length < previo.length) return nuevo;
  const n = nuevo.replace(/\D/g, '');
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4, 8)}`;
};

function InputField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={f.campo}>
      <Text style={f.label}>{label}</Text>
      {children}
      {error ? <Text style={f.errorText}>{error}</Text> : null}
    </View>
  );
}

function Requisito({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <View style={f.reqRow}>
      <View style={[f.reqDot, ok && f.reqDotOk]} />
      <Text style={[f.reqText, ok && f.reqTextOk]}>{texto}</Text>
    </View>
  );
}

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState<FormData>({ nombre: '', email: '', password: '', confirmPassword: '', fechaNacimiento: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const [verConfirm, setVerConfirm] = useState(false);

  const set = (campo: keyof FormData, valor: string) => {
    const val = campo === 'fechaNacimiento' ? formatFecha(valor, form.fechaNacimiento) : valor;
    setForm(prev => ({ ...prev, [campo]: val }));
    if (errors[campo]) setErrors(prev => ({ ...prev, [campo]: undefined }));
  };

  const validar = () => {
    const e: FormErrors = {};
    if (!form.nombre.trim() || form.nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres';
    const eEmail = validarEmail(form.email); if (eEmail) e.email = eEmail;
    const ePass = validarPassword(form.password); if (ePass) e.password = ePass;
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    const eFecha = validarFecha(form.fechaNacimiento); if (eFecha) e.fechaNacimiento = eFecha;
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
        options: { data: { nombre: form.nombre.trim(), fecha_nacimiento: toISO(form.fechaNacimiento) } },
      });
      if (error) {
        if (error.message.includes('already registered')) { setErrors(prev => ({ ...prev, email: 'Este correo ya está registrado' })); return; }
        throw error;
      }
      if (data.user) {
        if (data.session) {
          // El proyecto de Supabase tiene confirmación de email desactivada
          // (o ya estaba confirmado): hay sesión inmediata, así que el
          // perfil en public.usuarios se crea de una vez.
          const perfil = await asegurarPerfilUsuario(data.session);
          navigation.navigate('OnboardingEstilo', { userId: perfil.id, onComplete: () => { } });
        } else {
          // Confirmación de email obligatoria (RF-U01): el perfil se crea
          // en el primer login exitoso, una vez haya sesión real (ver PLogin.tsx).
          navigation.navigate('EmailConfirmation', { email: form.email.trim().toLowerCase() });
        }
      }
    } catch (err: any) {
      Alert.alert('Error al registrarse', err.message ?? 'Ocurrió un error inesperado.');
    } finally { setLoading(false); }
  };

  const fortaleza = (() => {
    const p = form.password;
    if (!p) return 0;
    let pts = 0;
    if (p.length >= 8) pts++; if (/[A-Z]/.test(p)) pts++;
    if (/[0-9]/.test(p)) pts++; if (/[^A-Za-z0-9]/.test(p)) pts++;
    return pts;
  })();

  const fortalezaColor = ['#E0E0E0', C.error, '#F5A623', '#F5A623', C.success][fortaleza];
  const fortalezaLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][fortaleza];

  return (
    <SafeAreaView style={f.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={f.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header con back */}
          <View style={f.topBar}>
            <TouchableOpacity style={f.backBtn} onPress={() => navigation.goBack()}>
              <Text style={f.backText}>← Volver</Text>
            </TouchableOpacity>
          </View>

          <View style={f.titlesWrap}>
            <Text style={f.eyebrow}>Únete a Styles</Text>
            <Text style={f.titulo}>Crea tu cuenta</Text>
            <Text style={f.subtitulo}>Comunidad de moda local colombiana</Text>
          </View>

          <View style={f.form}>
            <InputField label="Nombre" error={errors.nombre}>
              <TextInput style={[f.input, errors.nombre && f.inputError]} placeholder="¿Cómo te llamas?" placeholderTextColor={C.muted} value={form.nombre} onChangeText={v => set('nombre', v)} autoCapitalize="words" maxLength={50} />
            </InputField>

            <InputField label="Correo electrónico" error={errors.email}>
              <TextInput style={[f.input, errors.email && f.inputError]} placeholder="tu@correo.com" placeholderTextColor={C.muted} value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </InputField>

            <InputField label="Fecha de nacimiento" error={errors.fechaNacimiento}>
              <TextInput style={[f.input, errors.fechaNacimiento && f.inputError]} placeholder="DD/MM/AAAA" placeholderTextColor={C.muted} value={form.fechaNacimiento} onChangeText={v => set('fechaNacimiento', v)} keyboardType="numeric" maxLength={10} />
            </InputField>

            <InputField label="Contraseña" error={errors.password}>
              <View style={[f.inputRow, errors.password && f.inputError]}>
                <TextInput style={[f.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]} placeholder="Mínimo 8 caracteres" placeholderTextColor={C.muted} value={form.password} onChangeText={v => set('password', v)} secureTextEntry={!verPass} autoCapitalize="none" />
                <TouchableOpacity style={f.eyeBtn} onPress={() => setVerPass(v => !v)}>
                  {verPass
                    ? <EyeOff size={20} color={C.muted} strokeWidth={2} />
                    : <Eye size={20} color={C.muted} strokeWidth={2} />
                  }
                </TouchableOpacity>
              </View>
              {form.password.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                    {[1, 2, 3, 4].map(i => (
                      <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= fortaleza ? fortalezaColor : C.border }} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: fortalezaColor, fontWeight: '600', marginBottom: 6 }}>{fortalezaLabel}</Text>
                  <Requisito ok={form.password.length >= 8} texto="Mínimo 8 caracteres" />
                  <Requisito ok={/[A-Z]/.test(form.password)} texto="Una letra mayúscula" />
                  <Requisito ok={/[0-9]/.test(form.password)} texto="Un número" />
                </View>
              )}
            </InputField>

            <InputField label="Confirmar contraseña" error={errors.confirmPassword}>
              <View style={[f.inputRow, errors.confirmPassword && f.inputError]}>
                <TextInput style={[f.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]} placeholder="Repite tu contraseña" placeholderTextColor={C.muted} value={form.confirmPassword} onChangeText={v => set('confirmPassword', v)} secureTextEntry={!verConfirm} autoCapitalize="none" onSubmitEditing={handleRegister} returnKeyType="done" />
                <TouchableOpacity style={f.eyeBtn} onPress={() => setVerConfirm(v => !v)}>
                  {verConfirm
                    ? <EyeOff size={20} color={C.muted} strokeWidth={2} />
                    : <Eye size={20} color={C.muted} strokeWidth={2} />
                  }
                </TouchableOpacity>
              </View>
            </InputField>
          </View>

          <TouchableOpacity style={[f.btnPrimary, loading && f.btnDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={f.btnPrimaryText}>Crear cuenta</Text>}
          </TouchableOpacity>

          <Text style={f.legal}>
            Al registrarte aceptas nuestros{' '}
            <Text style={{ color: C.earth }}>Términos de uso</Text>
            {' '}y{' '}
            <Text style={{ color: C.earth }}>Política de privacidad</Text>
          </Text>

          <View style={f.footer}>
            <Text style={f.footerText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={f.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const f = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  topBar: { paddingTop: 16, paddingBottom: 4 },
  backBtn: { paddingVertical: 8 },
  backText: { fontSize: 14, color: C.earth, fontWeight: '500' },
  titlesWrap: { paddingTop: 16, paddingBottom: 24 },
  eyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 6 },
  titulo: { fontSize: 28, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 6 },
  subtitulo: { fontSize: 15, color: C.muted },
  form: { gap: 16, marginBottom: 8 },
  campo: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: C.muted, letterSpacing: 0.2 },
  input: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.ink },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, overflow: 'hidden' },
  inputError: { borderColor: C.error },
  eyeBtn: { paddingHorizontal: 14 },
  errorText: { fontSize: 12, color: C.error, marginTop: 2 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  reqDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  reqDotOk: { backgroundColor: C.success },
  reqText: { fontSize: 12, color: C.muted },
  reqTextOk: { color: C.success },
  btnPrimary: { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, alignItems: 'center', marginTop: 24, shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.65 },
  legal: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18, marginTop: 16, paddingHorizontal: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: C.muted },
  footerLink: { fontSize: 14, color: C.earth, fontWeight: '600' },
});