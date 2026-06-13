// src/features/auth/onboarding/OnboardingEstilo.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { C, R } from '../../../shared/theme';

interface Opcion     { id: string; label: string; emoji: string; }
interface Preferencias { estilos: string[]; telas: string[]; colores: string[]; }

const ESTILOS: Opcion[] = [
  { id: 'casual',      label: 'Casual',      emoji: '👕' },
  { id: 'formal',      label: 'Formal',      emoji: '👔' },
  { id: 'streetwear',  label: 'Streetwear',  emoji: '🧢' },
  { id: 'boho',        label: 'Boho',        emoji: '🌿' },
  { id: 'minimalista', label: 'Minimalista', emoji: '⬜' },
  { id: 'sport',       label: 'Sport',       emoji: '🏃' },
  { id: 'vintage',     label: 'Vintage',     emoji: '🎞️' },
  { id: 'elegante',    label: 'Elegante',    emoji: '✨' },
  { id: 'grunge',      label: 'Grunge',      emoji: '⛓️' },
  { id: 'preppy',      label: 'Preppy',      emoji: '🎓' },
];

const TELAS: Opcion[] = [
  { id: 'algodon',     label: 'Algodón',     emoji: '🌸' },
  { id: 'lino',        label: 'Lino',        emoji: '🌾' },
  { id: 'denim',       label: 'Denim',       emoji: '🔵' },
  { id: 'seda',        label: 'Seda',        emoji: '🪢' },
  { id: 'lana',        label: 'Lana',        emoji: '🐑' },
  { id: 'sintetico',   label: 'Sintético',   emoji: '⚡' },
  { id: 'cuero',       label: 'Cuero',       emoji: '🖤' },
  { id: 'terciopelo',  label: 'Terciopelo',  emoji: '💜' },
];

const COLORES: Opcion[] = [
  { id: 'neutros',       label: 'Neutros',     emoji: '🤍' },
  { id: 'tierra',        label: 'Tierra',      emoji: '🟫' },
  { id: 'pasteles',      label: 'Pasteles',    emoji: '🩷' },
  { id: 'oscuros',       label: 'Oscuros',     emoji: '🖤' },
  { id: 'vivos',         label: 'Vivos',       emoji: '🔴' },
  { id: 'monocromatico', label: 'Monocromas',  emoji: '⚫' },
  { id: 'metalicos',     label: 'Metálicos',   emoji: '🥈' },
  { id: 'estampados',    label: 'Estampados',  emoji: '🌺' },
];

const PASOS = [
  { numero: 1, eyebrow: 'Paso 1 de 3', titulo: 'Tu estilo',   subtitulo: '¿Cómo defines tu forma de vestir?',   opciones: ESTILOS, campo: 'estilos'  as keyof Preferencias },
  { numero: 2, eyebrow: 'Paso 2 de 3', titulo: 'Tus telas',   subtitulo: '¿Qué texturas disfrutas llevar?',     opciones: TELAS,   campo: 'telas'    as keyof Preferencias },
  { numero: 3, eyebrow: 'Paso 3 de 3', titulo: 'Tu paleta',   subtitulo: '¿Qué colores dominan tu armario?',   opciones: COLORES, campo: 'colores'  as keyof Preferencias },
];

interface Props { userId: string; onComplete: () => void; }

export default function OnboardingEstilo({ userId, onComplete }: Props) {
  const [pasoActual,    setPasoActual]    = useState(0);
  const [preferencias,  setPreferencias]  = useState<Preferencias>({ estilos: [], telas: [], colores: [] });
  const [guardando,     setGuardando]     = useState(false);

  const paso            = PASOS[pasoActual];
  const seleccionActual = preferencias[paso.campo];
  const esUltimoPaso    = pasoActual === PASOS.length - 1;

  const toggleOpcion = (id: string) => {
    setPreferencias(prev => {
      const actuales = prev[paso.campo];
      return { ...prev, [paso.campo]: actuales.includes(id) ? actuales.filter(i => i !== id) : [...actuales, id] };
    });
  };

  const avanzar = (limpiar = false) => {
    if (limpiar) setPreferencias(prev => ({ ...prev, [paso.campo]: [] }));
    esUltimoPaso ? guardarYCompletar() : setPasoActual(p => p + 1);
  };

  const guardarYCompletar = async () => {
    setGuardando(true);
    try {
      const { error } = await supabase.from('usuarios').update({
        preferencias_estilos: preferencias.estilos,
        preferencias_telas:   preferencias.telas,
        preferencias_colores: preferencias.colores,
        onboarding_completo:  true,
        updated_at:           new Date().toISOString(),
      }).eq('id', userId);
      if (error) throw error;
      await supabase.auth.refreshSession();
      onComplete();
    } catch {
      Alert.alert('Error al guardar', 'No pudimos guardar tus preferencias.', [
        { text: 'Reintentar', onPress: guardarYCompletar },
        { text: 'Continuar',  onPress: onComplete },
      ]);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={o.safe}>

      {/* Barra superior */}
      <View style={o.topBar}>
        {pasoActual > 0 ? (
          <TouchableOpacity style={o.backBtn} onPress={() => setPasoActual(p => p - 1)}>
            <Text style={o.backText}>← Atrás</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 64 }} />}

        {/* Barra de progreso */}
        <View style={o.progressWrap}>
          {PASOS.map((_, i) => (
            <View key={i} style={[o.progressSeg, i <= pasoActual && o.progressDone]} />
          ))}
        </View>

        <TouchableOpacity style={o.skipBtn} onPress={() => avanzar(true)}>
          <Text style={o.skipText}>Omitir</Text>
        </TouchableOpacity>
      </View>

      {/* Títulos (fijos, no hacen scroll) */}
      <View style={o.titlesWrap}>
        <Text style={o.eyebrow}>{paso.eyebrow}</Text>
        <Text style={o.titulo}>{paso.titulo}</Text>
        <Text style={o.subtitulo}>{paso.subtitulo}</Text>
      </View>

      {/* Grid de opciones */}
      <ScrollView contentContainerStyle={o.grid} showsVerticalScrollIndicator={false}>
        {paso.opciones.map(opcion => {
          const sel = seleccionActual.includes(opcion.id);
          return (
            <TouchableOpacity
              key={opcion.id}
              style={[o.chip, sel && o.chipSel]}
              onPress={() => toggleOpcion(opcion.id)}
              activeOpacity={0.75}
            >
              <Text style={o.chipEmoji}>{opcion.emoji}</Text>
              <Text style={[o.chipLabel, sel && o.chipLabelSel]}>{opcion.label}</Text>
              {sel && <View style={o.checkDot}><Text style={{ fontSize: 9, color: '#fff' }}>✓</Text></View>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={o.footer}>
        {seleccionActual.length > 0 && (
          <Text style={o.contadorText}>
            {seleccionActual.length} seleccionado{seleccionActual.length !== 1 ? 's' : ''}
          </Text>
        )}
        <TouchableOpacity
          style={[o.btnPrimary, guardando && o.btnDisabled]}
          onPress={() => avanzar(false)}
          disabled={guardando}
          activeOpacity={0.85}
        >
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={o.btnPrimaryText}>{esUltimoPaso ? 'Empezar a explorar →' : 'Continuar →'}</Text>
          }
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const o = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.white },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn:      { paddingVertical: 8, width: 64 },
  backText:     { fontSize: 14, color: C.earth, fontWeight: '500' },
  progressWrap: { flexDirection: 'row', gap: 5, flex: 1, marginHorizontal: 12 },
  progressSeg:  { flex: 1, height: 3, borderRadius: 2, backgroundColor: C.border },
  progressDone: { backgroundColor: C.earth },
  skipBtn:      { paddingVertical: 8, width: 64, alignItems: 'flex-end' },
  skipText:     { fontSize: 14, color: C.muted, fontWeight: '500' },
  titlesWrap:   { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },
  eyebrow:      { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 6 },
  titulo:       { fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 4 },
  subtitulo:    { fontSize: 14, color: C.muted },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, paddingBottom: 16 },
  chip:         { width: '47%', borderWidth: 1.5, borderColor: C.border, borderRadius: R.chip, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', backgroundColor: C.surface, position: 'relative', gap: 6 },
  chipSel:      { borderColor: C.earth, backgroundColor: C.earthLight },
  chipEmoji:    { fontSize: 26 },
  chipLabel:    { fontSize: 13, color: C.muted, fontWeight: '500', textAlign: 'center' },
  chipLabelSel: { color: C.earthDark, fontWeight: '600' },
  checkDot:     { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: C.earth, alignItems: 'center', justifyContent: 'center' },
  footer:       { padding: 20, paddingBottom: 32, borderTopWidth: 0.5, borderTopColor: C.border, gap: 10 },
  contadorText: { fontSize: 13, color: C.earth, fontWeight: '600', textAlign: 'center' },
  btnPrimary:   { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, alignItems: 'center', shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText:{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:  { opacity: 0.65 },
});