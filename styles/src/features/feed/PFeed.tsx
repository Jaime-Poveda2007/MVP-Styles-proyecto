// src/features/feed/PFeed.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFeed } from './useFeed';
import FeedGrid from './FeedGrid';
import PDetalle from './PDetalle';
import { Publicacion } from './types';
import { FeedStackParamList } from './NavFeed';
import { C } from '../../shared/theme';

interface Props {
  userId: string;
  onCerrarSesion: () => void;
}

type Nav = NativeStackNavigationProp<FeedStackParamList>;

export default function PFeed({ userId, onCerrarSesion }: Props) {
  const navigation = useNavigation<Nav>();
  const { publicaciones, cargando, cargandoMas, error, hayMas, cargarPrimera, cargarMas, refrescar } = useFeed();
  const [refrescando, setRefrescando] = useState(false);
  const [detalle,     setDetalle]     = useState<Publicacion | null>(null);

  useEffect(() => { cargarPrimera(userId); }, [userId]);

  const handleRefrescar = async () => {
    setRefrescando(true);
    await refrescar();
    setRefrescando(false);
  };

  if (detalle) {
    return (
      <PDetalle
        publicacion={detalle}
        userId={userId}
        onVolver={() => setDetalle(null)}
      />
    );
  }

  return (
    <SafeAreaView style={f.safe} edges={['top']}>

      {/* Header */}
      <View style={f.header}>
        <Text style={f.wordmark}>styles<Text style={f.dot}>.</Text></Text>
        {/* Logout temporal — en Mes 3 pasa al tab de Perfil */}
        <TouchableOpacity style={f.logoutBtn} onPress={onCerrarSesion}>
          <LogOut size={18} color={C.muted} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Error no bloqueante */}
      {error && !cargando && (
        <View style={f.errorBanner}>
          <Text style={f.errorText}>{error}</Text>
        </View>
      )}

      {/* Grid */}
      <FeedGrid
        publicaciones={publicaciones}
        userId={userId}
        cargando={cargando}
        cargandoMas={cargandoMas}
        hayMas={hayMas}
        refrescando={refrescando}
        onCargarMas={cargarMas}
        onRefrescar={handleRefrescar}
        onPressTarjeta={setDetalle}
      />

      {/* FAB — botón temporal de crear publicación */}
      <TouchableOpacity
        style={f.fab}
        onPress={() => navigation.navigate('CrearPublicacion')}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const f = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.white },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  wordmark:    { fontSize: 22, fontWeight: '800', letterSpacing: 0.5, color: C.ink },
  dot:         { color: C.earth },
  logoutBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.border },
  errorBanner: { backgroundColor: '#FDECEA', marginHorizontal: 16, marginTop: 8, borderRadius: 8, padding: 10 },
  errorText:   { fontSize: 13, color: '#C0392B', textAlign: 'center' },
  fab:         {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.earth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.earth,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});