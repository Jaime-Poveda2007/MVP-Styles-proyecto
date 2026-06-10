// src/features/auth/onboarding/OnboardingEstilo.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Opcion {
  id: string;
  label: string;
  emoji: string;
}

interface Preferencias {
  estilos: string[];
  telas: string[];
  colores: string[];
}

// ─── Datos ────────────────────────────────────────────────────────────────────

const ESTILOS: Opcion[] = [
  { id: 'casual', label: 'Casual', emoji: '👕' },
  { id: 'formal', label: 'Formal', emoji: '👔' },
  { id: 'streetwear', label: 'Streetwear', emoji: '🧢' },
  { id: 'boho', label: 'Boho', emoji: '🌿' },
  { id: 'minimalista', label: 'Minimalista', emoji: '⬜' },
  { id: 'sport', label: 'Sport', emoji: '🏃' },
  { id: 'vintage', label: 'Vintage', emoji: '🎞️' },
  { id: 'elegante', label: 'Elegante', emoji: '✨' },
  { id: 'grunge', label: 'Grunge', emoji: '⛓️' },
  { id: 'preppy', label: 'Preppy', emoji: '🎓' },
];

const TELAS: Opcion[] = [
  { id: 'algodon', label: 'Algodón', emoji: '🌸' },
  { id: 'lino', label: 'Lino', emoji: '🌾' },
  { id: 'denim', label: 'Denim', emoji: '🔵' },
  { id: 'seda', label: 'Seda', emoji: '🪢' },
  { id: 'lana', label: 'Lana', emoji: '🐑' },
  { id: 'sintetico', label: 'Sintético', emoji: '⚡' },
  { id: 'cuero', label: 'Cuero', emoji: '🖤' },
  { id: 'terciopelo', label: 'Terciopelo', emoji: '💜' },
];

const COLORES: Opcion[] = [
  { id: 'neutros', label: 'Neutros', emoji: '🤍' },
  { id: 'tierra', label: 'Tierra', emoji: '🟫' },
  { id: 'pasteles', label: 'Pasteles', emoji: '🩷' },
  { id: 'oscuros', label: 'Oscuros', emoji: '🖤' },
  { id: 'vivos', label: 'Vivos', emoji: '🔴' },
  { id: 'monocromatico', label: 'Monocromas', emoji: '⚫' },
  { id: 'metalicos', label: 'Metálicos', emoji: '🥈' },
  { id: 'estampados', label: 'Estampados', emoji: '🌺' },
];

const PASOS = [
  {
    numero: 1,
    titulo: 'Tu estilo',
    subtitulo: '¿Cómo defines tu forma de vestir?',
    descripcion: 'Elige todos los que te representen',
    opciones: ESTILOS,
    campo: 'estilos' as keyof Preferencias,
  },
  {
    numero: 2,
    titulo: 'Tus telas',
    subtitulo: '¿Qué texturas disfrutas llevar?',
    descripcion: 'Puedes seleccionar varias',
    opciones: TELAS,
    campo: 'telas' as keyof Preferencias,
  },
  {
    numero: 3,
    titulo: 'Tu paleta',
    subtitulo: '¿Qué colores dominan tu armario?',
    descripcion: 'Selecciona los que más usas',
    opciones: COLORES,
    campo: 'colores' as keyof Preferencias,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  onComplete: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function OnboardingEstilo({ userId, onComplete }: Props) {
  const [pasoActual, setPasoActual] = useState(0);
  const [preferencias, setPreferencias] = useState<Preferencias>({
    estilos: [],
    telas: [],
    colores: [],
  });
  const [guardando, setGuardando] = useState(false);

  const paso = PASOS[pasoActual];
  const seleccionActual = preferencias[paso.campo];
  const esUltimoPaso = pasoActual === PASOS.length - 1;

  const toggleOpcion = (id: string) => {
    setPreferencias((prev) => {
      const actuales = prev[paso.campo];
      return {
        ...prev,
        [paso.campo]: actuales.includes(id)
          ? actuales.filter((i) => i !== id)
          : [...actuales, id],
      };
    });
  };

  const avanzar = (limpiarPaso = false) => {
    if (limpiarPaso) {
      setPreferencias((prev) => ({ ...prev, [paso.campo]: [] }));
    }
    if (esUltimoPaso) {
      guardarYCompletar();
    } else {
      setPasoActual((p) => p + 1);
    }
  };

const guardarYCompletar = async () => {
  setGuardando(true);
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({
        preferencias_estilos: preferencias.estilos,
        preferencias_telas:   preferencias.telas,
        preferencias_colores: preferencias.colores,
        onboarding_completo:  true,
        updated_at:           new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    await supabase.auth.refreshSession(); // refresca token/sesión
    onComplete();                         // ← FALTABA ESTO en el flujo exitoso
  } catch (error: any) {
    Alert.alert(
      'Error al guardar',
      'No pudimos guardar tus preferencias.',
      [
        { text: 'Reintentar', onPress: guardarYCompletar },
        { text: 'Continuar',  onPress: onComplete },
      ]
    );
  } finally {
    setGuardando(false);
  }
};

  return (
    <SafeAreaView style={[styles.container, { flex: 1 }]}>
      {/* Envuelve header + titulo en View fija */}

      {/* Header */}
      <View style={styles.header}>
        {pasoActual > 0 ? (
          <TouchableOpacity onPress={() => setPasoActual((p) => p - 1)}>
            <Text>← Atrás</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {/* Indicador de progreso */}
        <Text>{pasoActual + 1} / {PASOS.length}</Text>

        <TouchableOpacity onPress={() => avanzar(true)}>
          <Text>Omitir</Text>
        </TouchableOpacity>
      </View>

      {/* Título */}
      <View style={styles.tituloContainer}>
        <Text style={styles.titulo}>{paso.titulo}</Text>
        <Text>{paso.subtitulo}</Text>
        <Text>{paso.descripcion}</Text>
      </View>

      {/* Opciones */}
      <ScrollView contentContainerStyle={styles.grid}>
        {paso.opciones.map((opcion) => {
          const seleccionada = seleccionActual.includes(opcion.id);
          return (
            <TouchableOpacity
              key={opcion.id}
              style={[styles.tarjeta, seleccionada && styles.tarjetaSeleccionada]}
              onPress={() => toggleOpcion(opcion.id)}
              activeOpacity={0.75}
            >
              <Text>{opcion.emoji}</Text>
              <Text>{opcion.label}</Text>
              {seleccionada && <Text>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {seleccionActual.length > 0 && (
          <Text>
            {seleccionActual.length} seleccionado{seleccionActual.length !== 1 ? 's' : ''}
          </Text>
        )}

        <TouchableOpacity
          style={styles.botonPrincipal}
          onPress={() => avanzar(false)}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.botonTexto}>
              {esUltimoPaso ? 'Empezar a explorar →' : 'Continuar →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ─── Estilos mínimos (placeholder — los estilos reales van después) ────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  tituloContainer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  titulo: { fontSize: 28, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 24, gap: 12 },
  tarjeta: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 16, alignItems: 'center', width: '45%' },
  tarjetaSeleccionada: { borderColor: '#000', backgroundColor: '#f5f5f5' },
  footer: { padding: 24, paddingBottom: 40, gap: 12, borderTopWidth: 0.5, borderTopColor: '#e5e5e5' },
  botonPrincipal: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 18, paddingHorizontal: 24, alignItems: 'center', minHeight: 56 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
