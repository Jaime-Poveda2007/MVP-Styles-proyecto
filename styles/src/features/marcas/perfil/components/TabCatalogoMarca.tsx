// src/features/marcas/perfil/components/TabCatalogoMarca.tsx
//
// Cuerpo de la pestaña "Catálogo" del perfil de marca (propio y
// público) — grid virtualizado (hasta 200 prendas activas por marca,
// LIMITE_PRENDAS_ACTIVAS) de TarjetaPrendaPublica.
import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { listarPrendasActivasDeLaMarca } from '../../catalogo/services/prendasService';
import { Prenda } from '../../catalogo/types';
import TarjetaPrendaPublica from '../../catalogo/components/TarjetaPrendaPublica';
import EstadoVacio from '../../../../shared/components/EstadoVacio';
import { C } from '../../../../shared/theme';

interface Props {
  marcaId: string;
  userId: string;
  onVerReseñas: (prendaId: string, nombre: string) => void;
}

export default function TabCatalogoMarca({ marcaId, userId, onVerReseñas }: Props) {
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarPrendasActivasDeLaMarca(marcaId);
      setPrendas(data);
    } catch {
      // dejar lista vacía visible
    } finally {
      setCargando(false);
    }
  }, [marcaId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return <View style={s.centro}><ActivityIndicator color={C.earth} /></View>;
  }

  return (
    <FlatList
      data={prendas}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={s.lista}
      columnWrapperStyle={s.fila}
      ListEmptyComponent={<EstadoVacio texto="Este catálogo está vacío por ahora." />}
      renderItem={({ item }) => (
        <TarjetaPrendaPublica
          prenda={item}
          userId={userId}
          onVerReseñas={() => onVerReseñas(item.id, item.nombre)}
        />
      )}
    />
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista:  { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },
  fila:   { justifyContent: 'space-between', marginBottom: 8 },
});
