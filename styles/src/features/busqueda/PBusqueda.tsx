// src/features/busqueda/PBusqueda.tsx
import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronLeft } from 'lucide-react-native';
import { C, R } from '../../shared/theme';
import { buscarPublicaciones, buscarUsuarios, buscarMarcas } from './busqueda.api';
import { obtenerPublicacionPorId } from '../feed/services/publicacionesService';
import { ResultadoPublicacion, ResultadoUsuario, ResultadoMarca, TabBusqueda } from './busqueda.types';
import TabsResultados from './components/TabsResultados';
import PDetalle from '../feed/PDetalle';
import { Publicacion } from '../feed/types';
import EstadoError from '../../shared/components/EstadoError';
import { mostrarAlerta } from '../../lib/alerta';

interface Props {
  userId: string;
  terminoInicial?: string;
  onVolver: () => void;
  esDeMarca?: boolean;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
}

export default function PBusqueda({ userId, terminoInicial, onVolver, esDeMarca = false, onVerPerfil }: Props) {
  const [termino, setTermino] = useState(terminoInicial ?? '');
  const [tab, setTab] = useState<TabBusqueda>('publicaciones');
  const [cargando, setCargando] = useState(false);
  const [huboBusqueda, setHuboBusqueda] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [publicaciones, setPublicaciones] = useState<ResultadoPublicacion[]>([]);
  const [usuarios, setUsuarios] = useState<ResultadoUsuario[]>([]);
  const [marcas, setMarcas] = useState<ResultadoMarca[]>([]);

  const [detalle, setDetalle] = useState<Publicacion | null>(null);

  const ejecutarBusqueda = async (t: string) => {
    setCargando(true);
    setError(null);
    try {
      const [pubs, usrs, mrcs] = await Promise.all([
        buscarPublicaciones(t),
        buscarUsuarios(t),
        buscarMarcas(t),
      ]);
      setPublicaciones(pubs);
      setUsuarios(usrs);
      setMarcas(mrcs);
      setHuboBusqueda(true);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo completar la búsqueda.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (termino.trim().length < 2) {
      setPublicaciones([]);
      setUsuarios([]);
      setMarcas([]);
      setHuboBusqueda(false);
      setError(null);
      return;
    }
    const timeout = setTimeout(() => ejecutarBusqueda(termino), 300);
    return () => clearTimeout(timeout);
  }, [termino]);

  const abrirPublicacion = async (resultado: ResultadoPublicacion) => {
    try {
      const fresca = await obtenerPublicacionPorId(resultado.id, userId, esDeMarca);
      setDetalle(fresca);
    } catch (e) {
      // Sin conexión / error: no navegamos a un detalle roto, pero sí
      // avisamos — antes esto fallaba en silencio y el tap parecía no
      // hacer nada.
      console.warn('No se pudo abrir la publicación desde la búsqueda:', e);
      mostrarAlerta('Error', 'No se pudo abrir esta publicación. Intenta de nuevo.');
    }
  };

  if (detalle) {
    return (
      <PDetalle
        publicacion={detalle}
        userId={userId}
        onVolver={() => setDetalle(null)}
        onEliminado={() => setDetalle(null)}
        esDeMarca={esDeMarca}
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
        <View style={s.inputWrap}>
          <Search size={16} color={C.muted} strokeWidth={2} />
          <TextInput
            style={s.input}
            value={termino}
            onChangeText={setTermino}
            placeholder="Buscar publicaciones, usuarios o marcas..."
            placeholderTextColor={C.muted}
            autoFocus={!terminoInicial}
            returnKeyType="search"
          />
          {cargando && <ActivityIndicator size="small" color={C.earth} />}
        </View>
      </View>

      {error && !cargando && (
        <EstadoError mensaje={error} onReintentar={() => ejecutarBusqueda(termino)} />
      )}

      <TabsResultados
        tab={tab}
        onCambiarTab={setTab}
        publicaciones={publicaciones}
        usuarios={usuarios}
        marcas={marcas}
        cargando={cargando}
        huboBusqueda={huboBusqueda}
        onPressPublicacion={abrirPublicacion}
        onPressUsuario={(item) => onVerPerfil(item.id)}
        onPressMarca={(item) => onVerPerfil(item.id, true)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.input, paddingHorizontal: 14, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 14, color: C.ink },
});