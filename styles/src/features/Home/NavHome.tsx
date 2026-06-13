// src/features/home/NavHome.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

interface Props {
  onCerrarSesion: () => void;
}

export default function HomeNavigator({ onCerrarSesion }: Props) {
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    onCerrarSesion();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>🏠 Home</Text>
      <Text style={styles.subtitulo}>Próximamente en Mes 2</Text>
      <TouchableOpacity style={styles.boton} onPress={cerrarSesion}>
        <Text style={styles.botonTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  titulo:      { fontSize: 28, fontWeight: '700' },
  subtitulo:   { fontSize: 15, color: '#888', marginBottom: 24 },
  boton:       { borderWidth: 1, borderColor: '#000', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  botonTexto:  { fontSize: 15, fontWeight: '500' },
});