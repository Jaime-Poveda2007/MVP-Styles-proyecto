// src/features/notificaciones/PNotificaciones.tsx
//
// Lista de notificaciones (like/repost recibidos, y para marca además
// etiquetas/reseñas de sus prendas). Al abrir la pantalla se marcan
// todas como leídas (mismo criterio que la mayoría de apps: el badge
// de la campana baja a 0 al entrar), pero la lista ya cargada sigue
// mostrando un punto en las que estaban sin leer al momento de abrir.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, Repeat2, Tag, Star } from 'lucide-react-native';
import AutorInline from '../../shared/components/AutorInline';
import EstadoVacio from '../../shared/components/EstadoVacio';
import EstadoError from '../../shared/components/EstadoError';
import PDetalle from '../feed/PDetalle';
import { obtenerPublicacionPorId } from '../feed/services/publicacionesService';
import { Publicacion } from '../feed/types';
import PReseñasPrenda from '../reseñas/screens/PReseñasPrenda';
import { listarNotificaciones, marcarTodasLeidas, Notificacion } from './notificaciones.api';
import { useTheme } from '../../shared/ThemeContext';

interface Props {
  userId: string;
  esDeMarca?: boolean;
  onVolver: () => void;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
}

const ICONOS: Record<Notificacion['tipo'], any> = {
  like: Heart,
  repost: Repeat2,
  etiqueta: Tag,
  reseña: Star,
};

function textoNotificacion(n: Notificacion): string {
  const actor = n.actor_usuario?.username ?? n.actor_marca?.nombre ?? 'Alguien';
  switch (n.tipo) {
    case 'like': return `${actor} le dio like a tu publicación`;
    case 'repost': return `${actor} reposteó tu publicación`;
    case 'etiqueta': return `${actor} etiquetó "${n.prenda?.nombre ?? 'una prenda'}" en una publicación`;
    case 'reseña': return `${actor} dejó una reseña en "${n.prenda?.nombre ?? 'una prenda'}"`;
  }
}

function tiempoRelativo(iso: string): string {
  const segundos = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return 'ahora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos}m`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias}d`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function PNotificaciones({ userId, esDeMarca = false, onVolver, onVerPerfil }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    safe:        { flex: 1, backgroundColor: C.white },
    centro:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
    backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
    titulo:      { fontSize: 16, fontWeight: '700', color: C.ink },
    lista:       { padding: 16, gap: 4 },
    fila:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
    puntoNoLeida:{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.earth, marginTop: 8 },
    puntoOculto: { backgroundColor: 'transparent' },
    icono:       { width: 30, height: 30, borderRadius: 15, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
    actorNombre: { fontSize: 13, fontWeight: '700', color: C.ink },
    texto:       { fontSize: 13, color: C.ink, lineHeight: 18 },
    tiempo:      { fontSize: 11, color: C.muted },
  }), [C]);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Publicacion | null>(null);
  const [reseñaSel, setReseñaSel] = useState<{ prendaId: string; nombre: string } | null>(null);

  const destino = esDeMarca ? { marcaId: userId } : { usuarioId: userId };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setItems(await listarNotificaciones(destino));
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar las notificaciones.');
    } finally {
      setCargando(false);
    }
  }, [userId, esDeMarca]);

  useEffect(() => {
    cargar();
    // Marcar como leídas al abrir — no bloquea la carga de la lista ni
    // le pisa el estado "leida" que ya se mostró (ver comentario de
    // cabecera).
    marcarTodasLeidas(destino).catch(() => {});
  }, [cargar]);

  const abrirNotificacion = async (n: Notificacion) => {
    if (n.publicacion_id) {
      try {
        setDetalle(await obtenerPublicacionPorId(n.publicacion_id, userId, esDeMarca));
      } catch (e) {
        console.warn('No se pudo abrir la publicación de la notificación:', e);
      }
      return;
    }
    if (n.tipo === 'reseña' && n.prenda_id) {
      setReseñaSel({ prendaId: n.prenda_id, nombre: n.prenda?.nombre ?? 'Prenda' });
    }
  };

  if (detalle) {
    return (
      <PDetalle
        publicacion={detalle}
        userId={userId}
        esDeMarca={esDeMarca}
        onVolver={() => setDetalle(null)}
        onEliminado={() => setDetalle(null)}
        onVerPerfil={onVerPerfil}
      />
    );
  }

  if (reseñaSel) {
    return (
      <PReseñasPrenda
        prendaId={reseñaSel.prendaId}
        nombrePrenda={reseñaSel.nombre}
        usuarioId={userId}
        esDeMarca={esDeMarca}
        onVolver={() => setReseñaSel(null)}
        onVerPerfil={onVerPerfil}
      />
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onVolver}>
          <ChevronLeft size={22} color={C.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.titulo}>Notificaciones</Text>
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.lista}
          ListEmptyComponent={
            error ? null : <EstadoVacio texto="Todavía no tienes notificaciones." />
          }
          renderItem={({ item }) => {
            const Icono = ICONOS[item.tipo];
            const actorNombre = item.actor_usuario?.username ?? item.actor_marca?.nombre ?? null;
            const actorFoto = item.actor_usuario?.foto_url ?? item.actor_marca?.logo_url ?? null;
            return (
              <TouchableOpacity style={s.fila} onPress={() => abrirNotificacion(item)} activeOpacity={0.85}>
                <View style={[s.puntoNoLeida, item.leida && s.puntoOculto]} />
                <View style={s.icono}>
                  <Icono size={16} color={C.earth} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <AutorInline nombre={actorNombre} fotoUrl={actorFoto} size={20} nombreEstilo={s.actorNombre} />
                  <Text style={s.texto} numberOfLines={2}>{textoNotificacion(item)}</Text>
                  <Text style={s.tiempo}>{tiempoRelativo(item.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
