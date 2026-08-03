// src/features/reseñas/screens/PReseñasPrenda.tsx
//
// RF-C02: pantalla dedicada de reseñas de UNA prenda del catálogo.
// Se abre desde PDetalle.tsx tocando "Ver reseñas" en el popup de una
// etiqueta o en la fila de "Prendas en este look" — mismo patrón que
// PrendasRelacionadas.tsx (sustituye la vista con useState, no es una
// ruta nueva del stack de navegación).
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import EstrellasSelector from '../components/EstrellasSelector';
import FormularioReseña from '../components/FormularioReseña';
import ListaReseñas from '../components/ListaReseñas';
import { useReseña } from '../useReseña';
import { listarReseñas, ReseñaConAutor } from '../reseñas.api';
import { C } from '../../../shared/theme';

interface Props {
  prendaId: string;
  nombrePrenda: string;
  marcaNombre?: string | null;
  usuarioId: string;
  onVolver: () => void;
  onVerPerfil?: (userId: string) => void;
}

export default function PReseñasPrenda({ prendaId, nombrePrenda, marcaNombre, usuarioId, onVolver, onVerPerfil }: Props) {
  const { miReseña, promedio, total, guardando, guardar, eliminar } = useReseña({ prendaId, usuarioId });

  const [reseñas, setReseñas] = useState<ReseñaConAutor[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  // Se recarga cada vez que "total" cambia (alguien publicó/editó/borró,
  // ya sea uno mismo o vía Realtime desde useReseña), así la lista
  // siempre queda sincronizada con el promedio que se ve arriba.
  const recargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const data = await listarReseñas(prendaId);
      setReseñas(data);
    } finally {
      setCargandoLista(false);
    }
  }, [prendaId]);

  useEffect(() => { recargarLista(); }, [recargarLista, total]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onVolver}>
          <ChevronLeft size={22} color={C.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo} numberOfLines={1}>{nombrePrenda}</Text>
          {marcaNombre && <Text style={s.subtitulo}>{marcaNombre}</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.resumenRow}>
          <EstrellasSelector valor={Math.round(promedio ?? 0)} soloLectura size={20} />
          <Text style={s.resumenTexto}>
            {promedio != null ? promedio.toFixed(1) : 'Sin reseñas'}{total > 0 ? ` · ${total} reseña${total === 1 ? '' : 's'}` : ''}
          </Text>
        </View>

        <FormularioReseña
          miReseña={miReseña}
          guardando={guardando}
          onGuardar={guardar}
          onEliminar={eliminar}
        />

        <View style={s.separador} />

        <ListaReseñas reseñas={reseñas} cargando={cargandoLista} onVerPerfil={onVerPerfil} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.white },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  titulo:       { fontSize: 16, fontWeight: '700', color: C.ink },
  subtitulo:    { fontSize: 12, color: C.muted, marginTop: 1 },
  scroll:       { padding: 16, paddingBottom: 40 },
  resumenRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  resumenTexto: { fontSize: 14, color: C.muted, fontWeight: '500' },
  separador:    { height: 0.5, backgroundColor: C.border, marginVertical: 20 },
});
