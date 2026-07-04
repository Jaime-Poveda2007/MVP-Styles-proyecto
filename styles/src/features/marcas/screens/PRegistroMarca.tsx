// src/features/marcas/screens/PRegistroMarca.tsx
//
// RF-M01: Formulario de registro de marca (nombre, email, ubicación,
// categoría) + contraseña con los mismos requisitos de seguridad que
// un usuario.
//
// TEMPORAL (decisión de producto para esta etapa del MVP, ver
// roadmap): se omite el campo NIT/RUT y la marca queda aprobada de
// inmediato (sin pantalla de "Pendiente de aprobación"). Ver los
// comentarios "TEMPORAL" en marcas.api.ts y marcaPerfil.ts para
// reactivar ambos requisitos más adelante.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { AuthStackParamList } from '../../auth/NavDeAuntenticacion';
import { registrarMarca, CATEGORIAS_MARCA, CategoriaMarca } from '../marcas.api';
import { C, R } from '../../../shared/theme';

interface FormData {
  nombre: string; email: string;
  pais: string; ciudad: string;
  password: string; confirmPassword: string;
}
interface FormErrors {
  nombre?: string; email?: string;
  pais?: string; ciudad?: string; categoria?: string;
  password?: string; confirmPassword?: string;
}

// Mismos requisitos que la contraseña de usuario (PRegistro.tsx):
// mínimo 8 caracteres, una mayúscula y un número.
const validarPassword = (p: string) => {
  if (p.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(p)) return 'Debe incluir una mayúscula';
  if (!/[0-9]/.test(p)) return 'Debe incluir un número';
};
const validarEmail = (e: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? undefined : 'Correo inválido';

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

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterMarca'>;

export default function PRegistroMarca({ navigation }: Props) {
  const [form, setForm] = useState<FormData>({
    nombre: '', email: '', pais: 'Colombia', ciudad: '',
    password: '', confirmPassword: '',
  });
  const [categoria, setCategoria] = useState<CategoriaMarca | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const [verConfirm, setVerConfirm] = useState(false);

  const set = (campo: keyof FormData, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (errors[campo as keyof FormErrors]) setErrors(prev => ({ ...prev, [campo]: undefined }));
  };

  const validar = () => {
    const e: FormErrors = {};
    if (!form.nombre.trim() || form.nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres';
    const eEmail = validarEmail(form.email); if (eEmail) e.email = eEmail;
    if (!form.pais.trim()) e.pais = 'Ingresa el país';
    if (!form.ciudad.trim()) e.ciudad = 'Ingresa la ciudad';
    if (!categoria) e.categoria = 'Selecciona una categoría';
    const ePass = validarPassword(form.password); if (ePass) e.password = ePass;
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegistro = async () => {
    if (!validar()) return;
    setLoading(true);
    try {
      const { requiereConfirmacion } = await registrarMarca({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        pais: form.pais,
        ciudad: form.ciudad,
        categoria: categoria!,
      });

      if (requiereConfirmacion) {
        // El correo de confirmación que envía Supabase Auth cumple aquí
        // la función de "correo de notificación al representante".
        navigation.navigate('EmailConfirmation', { email: form.email.trim().toLowerCase() });
      }
      // Si no requiere confirmación, App.tsx detecta la sesión nueva
      // (listener de onAuthStateChange) y entra directo al panel de
      // marca: por ahora el registro queda aprobado de inmediato (ver
      // nota de "TEMPORAL" en marcaPerfil.ts).
    } catch (err: any) {
      Alert.alert('Error al registrar la marca', err.message ?? 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
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

          <View style={f.topBar}>
            <TouchableOpacity style={f.backBtn} onPress={() => navigation.goBack()}>
              <Text style={f.backText}>← Volver</Text>
            </TouchableOpacity>
          </View>

          <View style={f.titlesWrap}>
            <Text style={f.eyebrow}>Marcas locales</Text>
            <Text style={f.titulo}>Registra tu marca</Text>
            <Text style={f.subtitulo}>Crea tu cuenta y empieza a publicar tu catálogo</Text>
          </View>

          <View style={f.form}>
            <InputField label="Nombre de la marca" error={errors.nombre}>
              <TextInput style={[f.input, errors.nombre && f.inputError]} placeholder="Ej. Taller Andina" placeholderTextColor={C.muted} value={form.nombre} onChangeText={v => set('nombre', v)} autoCapitalize="words" maxLength={80} />
            </InputField>

            <InputField label="Correo de contacto" error={errors.email}>
              <TextInput style={[f.input, errors.email && f.inputError]} placeholder="marca@correo.com" placeholderTextColor={C.muted} value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </InputField>

            <View style={f.fila}>
              <View style={{ flex: 1 }}>
                <InputField label="País" error={errors.pais}>
                  <TextInput style={[f.input, errors.pais && f.inputError]} placeholder="Colombia" placeholderTextColor={C.muted} value={form.pais} onChangeText={v => set('pais', v)} autoCapitalize="words" maxLength={56} />
                </InputField>
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Ciudad" error={errors.ciudad}>
                  <TextInput style={[f.input, errors.ciudad && f.inputError]} placeholder="Bogotá" placeholderTextColor={C.muted} value={form.ciudad} onChangeText={v => set('ciudad', v)} autoCapitalize="words" maxLength={85} />
                </InputField>
              </View>
            </View>

            <InputField label="Categoría" error={errors.categoria}>
              <View style={f.chipsFila}>
                {CATEGORIAS_MARCA.map(cat => {
                  const activo = categoria === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => { setCategoria(cat); if (errors.categoria) setErrors(prev => ({ ...prev, categoria: undefined })); }}
                      style={[f.chip, activo && f.chipActivo]}
                    >
                      <Text style={[f.chipTexto, activo && f.chipTextoActivo]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>
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
                <TextInput style={[f.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]} placeholder="Repite la contraseña" placeholderTextColor={C.muted} value={form.confirmPassword} onChangeText={v => set('confirmPassword', v)} secureTextEntry={!verConfirm} autoCapitalize="none" onSubmitEditing={handleRegistro} returnKeyType="done" />
                <TouchableOpacity style={f.eyeBtn} onPress={() => setVerConfirm(v => !v)}>
                  <Text>{verConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </InputField>
          </View>

          <TouchableOpacity style={[f.btnPrimary, loading && f.btnDisabled]} onPress={handleRegistro} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={f.btnPrimaryText}>Enviar solicitud</Text>}
          </TouchableOpacity>

          <Text style={f.legal}>
            Al registrar tu marca podrás publicar tu catálogo de inmediato.
          </Text>

          <View style={f.footer}>
            <Text style={f.footerText}>¿Ya registraste tu marca? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('LoginMarca')}>
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
  titulo: { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 6 },
  subtitulo: { fontSize: 15, color: C.muted },
  form: { gap: 16, marginBottom: 8 },
  fila: { flexDirection: 'row', gap: 12 },
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
  chipsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.chip, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  chipActivo: { backgroundColor: C.earth, borderColor: C.earth },
  chipTexto: { fontSize: 13, color: C.ink, fontWeight: '500' },
  chipTextoActivo: { color: C.white },
  btnPrimary: { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, alignItems: 'center', marginTop: 24, shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.65 },
  legal: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18, marginTop: 16, paddingHorizontal: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: C.muted },
  footerLink: { fontSize: 14, color: C.earth, fontWeight: '600' },
});
