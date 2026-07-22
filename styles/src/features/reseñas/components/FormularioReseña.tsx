// src/features/reseñas/components/FormularioReseña.tsx
//
// RF-C02. Componente CONTROLADO: recibe el estado por props en vez de
// llamar a useReseña directamente, porque vive junto a ListaReseñas
// dentro de PReseñasPrenda.tsx y ambos comparten el mismo hook (un
// solo canal de Realtime para esa prenda).
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import EstrellasSelector from './EstrellasSelector';
import { Reseña } from '../reseñas.api';
import { C, R } from '../../../shared/theme';

interface Props {
  miReseña: Reseña | null;
  guardando: boolean;
  onGuardar: (estrellas: number, comentario?: string) => Promise<boolean>;
  onEliminar: () => void;
}

export default function FormularioReseña({ miReseña, guardando, onGuardar, onEliminar }: Props) {
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    setEstrellas(miReseña?.estrellas ?? 0);
    setComentario(miReseña?.comentario ?? '');
  }, [miReseña]);

  const guardar = async () => {
    if (estrellas < 1) {
      Alert.alert('Falta la valoración', 'Selecciona de 1 a 5 estrellas antes de publicar.');
      return;
    }
    const ok = await onGuardar(estrellas, comentario);
    if (!ok) Alert.alert('Error', 'No se pudo guardar tu reseña.');
  };

  const confirmarEliminar = () => {
    Alert.alert('Eliminar reseña', '¿Seguro que quieres eliminar tu reseña?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onEliminar },
    ]);
  };

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{miReseña ? 'Tu reseña' : 'Deja tu reseña'}</Text>
      <EstrellasSelector valor={estrellas} onCambiar={setEstrellas} />

      <TextInput
        style={s.input}
        placeholder="Comentario (opcional, máx. 200 caracteres)"
        placeholderTextColor={C.muted}
        value={comentario}
        onChangeText={(t) => setComentario(t.slice(0, 200))}
        multiline
        maxLength={200}
      />
      <Text style={s.contador}>{comentario.length}/200</Text>

      <View style={s.acciones}>
        <TouchableOpacity style={[s.btnPrimario, guardando && { opacity: 0.6 }]} onPress={guardar} disabled={guardando}>
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnPrimarioTexto}>{miReseña ? 'Guardar cambios' : 'Publicar reseña'}</Text>
          }
        </TouchableOpacity>
        {miReseña && (
          <TouchableOpacity style={s.btnEliminar} onPress={confirmarEliminar} disabled={guardando}>
            <Trash2 size={16} color={C.error} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:             { gap: 10 },
  label:            { fontSize: 13, fontWeight: '600', color: C.ink, marginTop: 6 },
  input:            { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.input, padding: 12, minHeight: 60, textAlignVertical: 'top', color: C.ink, fontSize: 13 },
  contador:         { alignSelf: 'flex-end', color: C.muted, fontSize: 11 },
  acciones:         { flexDirection: 'row', gap: 10, alignItems: 'center' },
  btnPrimario:      { flex: 1, backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 13, alignItems: 'center' },
  btnPrimarioTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnEliminar:      { width: 44, height: 44, borderRadius: R.btn, borderWidth: 1, borderColor: C.error, alignItems: 'center', justifyContent: 'center' },
});
