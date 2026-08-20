// src/features/perfil/PMisReposts.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Repeat2, Trash2 } from 'lucide-react-native';
import { listarMisReposts, eliminarRepost, RepostConOriginal } from './reposts.api';
import PDetalle from '../feed/PDetalle';
import { Publicacion } from '../feed/types';
import EstadoVacio from '../../shared/components/EstadoVacio';
import EstadoError from '../../shared/components/EstadoError';
import { useTheme } from '../../shared/ThemeContext';
import { mostrarAlerta } from '../../lib/alerta';

interface Props {
  userId: string;
  onVolver: () => void;
  onVerPerfil?: (targetId: string, esDeMarca?: boolean) => void;
}

export default function PMisReposts({ userId, onVolver, onVerPerfil }: Props) {
  const { C, R } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    safe:          { flex: 1, backgroundColor: C.white },
    header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
    backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
    titulo:        { fontSize: 16, fontWeight: '700', color: C.ink },
    centro:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 32 },
    lista:         { padding: 16, gap: 4 },
    fila:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
    thumb:         { width: 56, height: 56, borderRadius: R.input, backgroundColor: C.earthLight },
    creditoRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    creditoTexto:  { fontSize: 11, color: C.muted, flexShrink: 1 },
    descripcion:   { fontSize: 13, color: C.ink },
    deshacerBtn:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  }), [C, R]);
  const [items, setItems] = useState<RepostConOriginal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<Publicacion | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const data = await listarMisReposts(userId);
      setItems(data);
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar tus reposts.');
    } finally {
      setCargando(false);
    }
  }, [userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleDeshacer = async (repostId: string) => {
    setQuitando(repostId);
    try {
      await eliminarRepost(repostId);
      setItems(prev => prev.filter(i => i.repostId !== repostId));
    } catch (e: any) {
      mostrarAlerta('Error', e.message ?? 'No se pudo deshacer el repost.');
    } finally {
      setQuitando(null);
    }
  };

  if (abierto) {
    return (
      <PDetalle
        publicacion={abierto}
        userId={userId}
        onVolver={() => setAbierto(null)}
        onEliminado={() => { setAbierto(null); cargar(); }}
        onVerPerfil={onVerPerfil}
      />
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onVolver}>
          <ChevronLeft size={22} color={C.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.titulo}>Tus reposts</Text>
        <View style={{ width: 36 }} />
      </View>

      {error && !cargando && (
        <EstadoError mensaje={error} onReintentar={cargar} />
      )}

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={C.earth} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.repostId}
          contentContainerStyle={s.lista}
          ListEmptyComponent={
            error ? null : (
              <EstadoVacio icon={Repeat2} texto="Todavía no has reposteado ninguna publicación." />
            )
          }
          renderItem={({ item }) => {
            const pub = item.publicacion;
            const nombreOriginal = pub.es_de_marca ? pub.marca?.nombre : pub.usuario?.username;
            return (
              <TouchableOpacity style={s.fila} onPress={() => setAbierto(pub)} activeOpacity={0.85}>
                <Image source={{ uri: pub.imagen_url }} style={s.thumb} />
                <View style={{ flex: 1 }}>
                  {/* Crédito visible al autor original (RF-U06) */}
                  <View style={s.creditoRow}>
                    <Repeat2 size={12} color={C.success} strokeWidth={2.5} />
                    <Text style={s.creditoTexto} numberOfLines={1}>
                      Reposteado · originalmente por{' '}
                      <Text style={{ fontWeight: '700' }}>{nombreOriginal ?? '—'}</Text>
                    </Text>
                  </View>
                  {pub.descripcion ? (
                    <Text style={s.descripcion} numberOfLines={2}>{pub.descripcion}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={s.deshacerBtn}
                  onPress={() => handleDeshacer(item.repostId)}
                  disabled={quitando === item.repostId}
                >
                  {quitando === item.repostId
                    ? <ActivityIndicator size="small" color={C.error} />
                    : <Trash2 size={16} color={C.error} strokeWidth={2} />
                  }
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}