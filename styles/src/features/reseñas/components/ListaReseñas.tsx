// src/features/reseñas/components/ListaReseñas.tsx
//
// Lista completa (sin colapsar) de las reseñas escritas de una prenda:
// avatar, usuario, fecha, estrellas, comentario. Antes esto vivía
// colapsado dentro de PDetalle.tsx; ahora vive siempre expandido
// dentro de la pantalla dedicada PReseñasPrenda.tsx.
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import EstrellasSelector from './EstrellasSelector';
import AutorInline from '../../../shared/components/AutorInline';
import EstadoVacio from '../../../shared/components/EstadoVacio';
import { ReseñaConAutor } from '../reseñas.api';
import { C } from '../../../shared/theme';

interface Props {
  reseñas: ReseñaConAutor[];
  cargando: boolean;
  onVerPerfil?: (userId: string) => void;
}

function formatearFecha(iso: string): string {
  const f = new Date(iso);
  return f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ListaReseñas({ reseñas, cargando, onVerPerfil }: Props) {
  if (cargando) return <ActivityIndicator color={C.earth} style={{ marginTop: 16 }} />;

  if (reseñas.length === 0) {
    return <EstadoVacio texto="Todavía no hay reseñas para esta prenda." />;
  }

  return (
    <View style={s.lista}>
      {reseñas.map((r) => (
        <View key={r.id} style={s.fila}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={s.filaHeader}>
              <AutorInline
                nombre={r.usuario?.username ?? 'Usuario'}
                fotoUrl={r.usuario?.foto_url ?? null}
                size={32}
                nombreEstilo={s.username}
                onPress={onVerPerfil ? () => onVerPerfil(r.usuario_id) : undefined}
              />
              <Text style={s.fecha}>{formatearFecha(r.created_at)}</Text>
            </View>
            <EstrellasSelector valor={r.estrellas} soloLectura size={13} />
            {r.comentario ? <Text style={s.comentario}>{r.comentario}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  lista:        { gap: 18 },
  fila:         { flexDirection: 'row', gap: 10, borderBottomWidth: 0.5, borderBottomColor: C.border, paddingBottom: 14 },
  filaHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username:     { fontSize: 13, fontWeight: '600', color: C.ink },
  fecha:        { fontSize: 11, color: C.muted },
  comentario:   { fontSize: 13, color: C.ink, marginTop: 4, lineHeight: 18 },
});
