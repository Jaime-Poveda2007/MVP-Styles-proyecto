// src/features/marcas/perfil/components/TabRepostsMarca.tsx
//
// Cuerpo de la pestaña "Reposts" del perfil de marca — a diferencia de
// "Mis reposts" de usuario (PMisReposts.tsx, privado), esta pestaña es
// PÚBLICA: cualquiera que visite el perfil de la marca la puede ver.
// El botón de deshacer solo aparece cuando esPropio (la propia marca
// viendo su perfil), igual que "Mis reposts" ya hace hoy para usuario.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Repeat2, Trash2 } from 'lucide-react-native';
import { listarRepostsDeMarca } from '../../marcas.api';
import { eliminarRepost, RepostConOriginal } from '../../../perfil/reposts.api';
import { Publicacion } from '../../../feed/types';
import EstadoVacio from '../../../../shared/components/EstadoVacio';
import { useTheme } from '../../../../shared/ThemeContext';
import { mostrarAlerta } from '../../../../lib/alerta';

interface Props {
  marcaId: string;
  esPropio: boolean;
  onAbrirDetalle: (item: Publicacion) => void;
}

export default function TabRepostsMarca({ marcaId, esPropio, onAbrirDetalle }: Props) {
  const { C, R } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    centro:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  const [quitando, setQuitando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarRepostsDeMarca(marcaId);
      setItems(data);
    } catch {
      // dejar lista vacía visible
    } finally {
      setCargando(false);
    }
  }, [marcaId]);

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

  if (cargando) {
    return <View style={s.centro}><ActivityIndicator color={C.earth} /></View>;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.repostId}
      contentContainerStyle={s.lista}
      ListEmptyComponent={
        <EstadoVacio
          icon={Repeat2}
          texto={esPropio ? 'Todavía no has reposteado ninguna publicación.' : 'Esta marca no ha reposteado publicaciones aún.'}
        />
      }
      renderItem={({ item }) => {
        const pub = item.publicacion;
        const nombreOriginal = pub.es_de_marca ? pub.marca?.nombre : pub.usuario?.username;
        return (
          <TouchableOpacity style={s.fila} onPress={() => onAbrirDetalle(pub)} activeOpacity={0.85}>
            <Image source={{ uri: pub.imagen_url }} style={s.thumb} />
            <View style={{ flex: 1 }}>
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
            {esPropio && (
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
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}
