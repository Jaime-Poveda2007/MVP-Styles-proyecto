// src/features/reseñas/components/ListaReseñas.tsx
//
// Lista completa (sin colapsar) de las reseñas escritas de una prenda:
// avatar, usuario, fecha, estrellas, comentario. Antes esto vivía
// colapsado dentro de PDetalle.tsx; ahora vive siempre expandido
// dentro de la pantalla dedicada PReseñasPrenda.tsx.
import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import EstrellasSelector from './EstrellasSelector';
import { ReseñaConAutor } from '../reseñas.api';
import { C } from '../../../shared/theme';

interface Props {
  reseñas: ReseñaConAutor[];
  cargando: boolean;
}

function formatearFecha(iso: string): string {
  const f = new Date(iso);
  return f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ListaReseñas({ reseñas, cargando }: Props) {
  if (cargando) return <ActivityIndicator color={C.earth} style={{ marginTop: 16 }} />;

  if (reseñas.length === 0) {
    return <Text style={s.vacioTexto}>Todavía no hay reseñas para esta prenda.</Text>;
  }

  return (
    <View style={s.lista}>
      {reseñas.map((r) => (
        <View key={r.id} style={s.fila}>
          {r.usuario?.foto_url
            ? <Image source={{ uri: r.usuario.foto_url }} style={s.avatar} />
            : <View style={s.avatarPH}><Text style={s.avatarLetra}>{(r.usuario?.username ?? '?')[0].toUpperCase()}</Text></View>
          }
          <View style={{ flex: 1 }}>
            <View style={s.filaHeader}>
              <Text style={s.username}>{r.usuario?.username ?? 'Usuario'}</Text>
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
  vacioTexto:   { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 24 },
  fila:         { flexDirection: 'row', gap: 10, borderBottomWidth: 0.5, borderBottomColor: C.border, paddingBottom: 14 },
  avatar:       { width: 32, height: 32, borderRadius: 16 },
  avatarPH:     { width: 32, height: 32, borderRadius: 16, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  avatarLetra:  { fontSize: 13, fontWeight: '700', color: C.earth },
  filaHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username:     { fontSize: 13, fontWeight: '600', color: C.ink },
  fecha:        { fontSize: 11, color: C.muted },
  comentario:   { fontSize: 13, color: C.ink, marginTop: 4, lineHeight: 18 },
});
