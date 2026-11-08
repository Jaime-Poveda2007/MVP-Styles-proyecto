// src/features/auth/onboarding/OnboardingEstilo.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shirt, Briefcase, Backpack, Leaf, Square, Dumbbell, Film, Crown, Link, GraduationCap,
  Cloud, Wheat, Layers, Feather, Snowflake, Zap, Shield, Gem, Flower2, Check,
  LucideIcon,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { mostrarBotones } from '../../../lib/alerta';
import { C, R } from '../../../shared/theme';

// Cada opción lleva un icono; las de color usan un círculo del color en vez de icono.
interface Opcion     { id: string; label: string; icono?: LucideIcon; color?: string; }
interface Preferencias { estilos: string[]; telas: string[]; colores: string[]; }

const ESTILOS: Opcion[] = [
  { id: 'casual',      label: 'Casual',      icono: Shirt },
  { id: 'formal',      label: 'Formal',      icono: Briefcase },
  { id: 'streetwear',  label: 'Streetwear',  icono: Backpack },
  { id: 'boho',        label: 'Boho',        icono: Leaf },
  { id: 'minimalista', label: 'Minimalista', icono: Square },
  { id: 'sport',       label: 'Sport',       icono: Dumbbell },
  { id: 'vintage',     label: 'Vintage',     icono: Film },
  { id: 'elegante',    label: 'Elegante',    icono: Crown },
  { id: 'grunge',      label: 'Grunge',      icono: Link },
  { id: 'preppy',      label: 'Preppy',      icono: GraduationCap },
];

const TELAS: Opcion[] = [
  { id: 'algodon',     label: 'Algodón',     icono: Cloud },
  { id: 'lino',        label: 'Lino',        icono: Wheat },
  { id: 'denim',       label: 'Denim',       icono: Layers },
  { id: 'seda',        label: 'Seda',        icono: Feather },
  { id: 'lana',        label: 'Lana',        icono: Snowflake },
  { id: 'sintetico',   label: 'Sintético',   icono: Zap },
  { id: 'cuero',       label: 'Cuero',       icono: Shield },
  { id: 'terciopelo',  label: 'Terciopelo',  icono: Gem },
];

const COLORES: Opcion[] = [
  { id: 'neutros',       label: 'Neutros',     color: '#D8CBB8' },
  { id: 'tierra',        label: 'Tierra',      color: '#8B5E3C' },
  { id: 'pasteles',      label: 'Pasteles',    color: '#F4C6D0' },
  { id: 'oscuros',       label: 'Oscuros',     color: '#2B2623' },
  { id: 'vivos',         label: 'Vivos',       color: '#E53935' },
  { id: 'monocromatico', label: 'Monocromas',  color: '#8A8A8A' },
  { id: 'metalicos',     label: 'Metálicos',   color: '#B4BCC4' },
  { id: 'estampados',    label: 'Estampados',  icono: Flower2 },
];

const PASOS = [
  { numero: 1, eyebrow: 'Paso 1 de 3', titulo: 'Tu estilo',   subtitulo: '¿Cómo defines tu forma de vestir?',   opciones: ESTILOS, campo: 'estilos'  as keyof Preferencias },
  { numero: 2, eyebrow: 'Paso 2 de 3', titulo: 'Tus telas',   subtitulo: '¿Qué texturas disfrutas llevar?',     opciones: TELAS,   campo: 'telas'    as keyof Preferencias },
  { numero: 3, eyebrow: 'Paso 3 de 3', titulo: 'Tu paleta',   subtitulo: '¿Qué colores dominan tu armario?',   opciones: COLORES, campo: 'colores'  as keyof Preferencias },
];

interface Props {
  userId: string;
  onComplete: () => void;
  // RF-U11: reutilizado también para "editar preferencias" desde el
  // perfil (ver PEditarPreferencias.tsx). En modo 'edicion' se precarga
  // la selección actual y NO se vuelve a marcar onboarding_completo.
  preferenciasIniciales?: Preferencias;
  modo?: 'onboarding' | 'edicion';
}

export default function OnboardingEstilo({
  userId, onComplete,
  preferenciasIniciales = { estilos: [], telas: [], colores: [] },
  modo = 'onboarding',
}: Props) {
  const [pasoActual,    setPasoActual]    = useState(0);
  const [preferencias,  setPreferencias]  = useState<Preferencias>(preferenciasIniciales);
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
      // preferencias_usuario es una tabla aparte (estilos/telas/colores),
      // NO columnas de "usuarios" — alineado con styles_database.sql.
      const { error: errorPref } = await supabase
        .from('preferencias_usuario')
        .upsert({
          usuario_id: userId,
          estilos:    preferencias.estilos,
          telas:      preferencias.telas,
          colores:    preferencias.colores,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'usuario_id' });
      if (errorPref) throw errorPref;

      if (modo === 'onboarding') {
        const { error: errorUsuario } = await supabase
          .from('usuarios')
          .update({ onboarding_completo: true })
          .eq('id', userId);
        if (errorUsuario) throw errorUsuario;

        await supabase.auth.refreshSession();
      }
      onComplete();
    } catch {
      mostrarBotones('Error al guardar', 'No pudimos guardar tus preferencias.', [
        { texto: 'Continuar igual', variante: 'secundario', onPress: onComplete },
        { texto: 'Reintentar', variante: 'primario', onPress: guardarYCompletar },
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
              {opcion.icono
                ? <opcion.icono size={26} color={sel ? C.earthDark : C.muted} strokeWidth={1.8} />
                : <View style={[o.swatch, { backgroundColor: opcion.color }]} />}
              <Text style={[o.chipLabel, sel && o.chipLabelSel]}>{opcion.label}</Text>
              {sel && <View style={o.checkDot}><Check size={10} color={C.white} strokeWidth={3} /></View>}
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
            ? <ActivityIndicator color={C.white} />
            : <Text style={o.btnPrimaryText}>
                {esUltimoPaso ? (modo === 'edicion' ? 'Guardar cambios' : 'Empezar a explorar →') : 'Continuar →'}
              </Text>
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
  swatch:       { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: C.border },
  chipLabel:    { fontSize: 13, color: C.muted, fontWeight: '500', textAlign: 'center' },
  chipLabelSel: { color: C.earthDark, fontWeight: '600' },
  checkDot:     { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: C.earth, alignItems: 'center', justifyContent: 'center' },
  footer:       { padding: 20, paddingBottom: 32, borderTopWidth: 0.5, borderTopColor: C.border, gap: 10 },
  contadorText: { fontSize: 13, color: C.earth, fontWeight: '600', textAlign: 'center' },
  btnPrimary:   { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 17, alignItems: 'center', shadowColor: C.earth, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryText:{ color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:  { opacity: 0.65 },
});