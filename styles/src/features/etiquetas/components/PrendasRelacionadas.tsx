// src/features/etiquetas/components/PrendasRelacionadas.tsx
//
// Pantalla de "Ver prendas relacionadas" (se abre al tocar una etiqueta
// en PDetalle). Busca otras etiquetas parecidas en TODA la app usando
// prendas_relacionadas() (función SQL con pg_trgm) y las agrupa en 3
// niveles, de más a menos parecida:
//   1) Exactamente esta prenda   -> misma marca y nombre casi idéntico
//   2) Más de la misma marca     -> misma marca, nombre relacionado
//   3) Prendas similares         -> mismo tipo de prenda, otra marca
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Tag } from 'lucide-react-native';
import { buscarPrendasRelacionadas, PrendaRelacionada } from '../etiquetas.api';
import { obtenerPublicacionPorId } from '../../feed/services/publicacionesService';
import { Publicacion } from '../../feed/types';
import PDetalle from '../../feed/PDetalle';
import { C, R } from '../../../shared/theme';
import { mostrarAlerta } from '../../../lib/alerta';

interface Props {
  marca: string | null;
  nombre: string;
  etiquetaId?: string;
  userId: string;
  onVolver: () => void;
}

interface Grupo {
  nivel: 1 | 2 | 3;
  titulo: string;
  data: PrendaRelacionada[];
}

export default function PrendasRelacionadas({ marca, nombre, etiquetaId, userId, onVolver }: Props) {
  const [resultados, setResultados] = useState<PrendaRelacionada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicacionAbierta, setPublicacionAbierta] = useState<Publicacion | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await buscarPrendasRelacionadas(marca, nombre, etiquetaId);
        setResultados(data);
      } catch (e: any) {
        setError(e.message ?? 'No se pudieron cargar las prendas relacionadas.');
      } finally {
        setCargando(false);
      }
    })();
  }, [marca, nombre, etiquetaId]);

  async function abrirPublicacion(publicacionId: string) {
    setAbriendo(publicacionId);
    try {
      const pub = await obtenerPublicacionPorId(publicacionId, userId);
      setPublicacionAbierta(pub);
    } catch (e: any) {
      mostrarAlerta('Error', e.message ?? 'No se pudo abrir esta publicación.');
    } finally {
      setAbriendo(null);
    }
  }

  if (publicacionAbierta) {
    return (
      <PDetalle
        publicacion={publicacionAbierta}
        userId={userId}
        onVolver={() => setPublicacionAbierta(null)}
        onEliminado={() => setPublicacionAbierta(null)}
      />
    );
  }

  const grupos: Grupo[] = [
    { nivel: 1 as const, titulo: 'Exactamente esta prenda', data: resultados.filter(r => r.nivel === 1) },
    { nivel: 2 as const, titulo: marca ? `Más de ${marca}` : 'Misma marca', data: resultados.filter(r => r.nivel === 2) },
    { nivel: 3 as const, titulo: 'Prendas similares', data: resultados.filter(r => r.nivel === 3) },
  ].filter(g => g.data.length > 0);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onVolver}>
          <ChevronLeft size={22} color={C.ink} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo} numberOfLines={1}>{nombre}</Text>
          {marca && <Text style={s.subtitulo}>{marca}</Text>}
        </View>
      </View>

      {cargando && (
        <View style={s.centro}><ActivityIndicator color={C.earth} /></View>
      )}

      {!cargando && error && (
        <View style={s.centro}><Text style={s.vacioTexto}>{error}</Text></View>
      )}

      {!cargando && !error && grupos.length === 0 && (
        <View style={s.centro}>
          <Tag size={22} color={C.muted} strokeWidth={2} />
          <Text style={s.vacioTexto}>
            Todavía no hay otras prendas parecidas etiquetadas en Styles.
          </Text>
        </View>
      )}

      {!cargando && !error && grupos.length > 0 && (
        <FlatList
          data={grupos}
          keyExtractor={(g) => String(g.nivel)}
          contentContainerStyle={s.lista}
          renderItem={({ item: grupo }) => (
            <View style={s.grupo}>
              <Text style={s.grupoTitulo}>{grupo.titulo}</Text>
              {grupo.data.map((r) => (
                <Pressable
                  key={r.etiqueta_id}
                  style={s.fila}
                  onPress={() => abrirPublicacion(r.publicacion_id)}
                  disabled={abriendo === r.publicacion_id}
                >
                  {(r.imagen_prenda || r.imagen_publicacion) ? (
                    <Image source={{ uri: r.imagen_prenda ?? r.imagen_publicacion! }} style={s.thumb} />
                  ) : (
                    <View style={[s.thumb, s.thumbPH]}>
                      <Tag size={16} color={C.earth} strokeWidth={2} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.filaNombre} numberOfLines={1}>{r.nombre_texto}</Text>
                    {r.marca_texto && <Text style={s.filaMarca} numberOfLines={1}>{r.marca_texto}</Text>}
                  </View>
                  {r.precio != null && (
                    <Text style={s.filaPrecio}>${r.precio.toLocaleString('es-CO')}</Text>
                  )}
                  {abriendo === r.publicacion_id && <ActivityIndicator size="small" color={C.earth} />}
                </Pressable>
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 16, fontWeight: '700', color: C.ink },
  subtitulo: { fontSize: 12, color: C.muted, marginTop: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  vacioTexto: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
  lista: { padding: 16, gap: 20 },
  grupo: { gap: 8 },
  grupoTitulo: { fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
  thumb: { width: 180, height: 180, borderRadius: 30, backgroundColor: C.earthLight },
  thumbPH: { alignItems: 'center', justifyContent: 'center' },
  filaNombre: { fontSize: 14, fontWeight: '600', color: C.ink },
  filaMarca: { fontSize: 12, color: C.muted, marginTop: 2 },
  filaPrecio: { fontSize: 13, fontWeight: '700', color: C.earthDark },
});
