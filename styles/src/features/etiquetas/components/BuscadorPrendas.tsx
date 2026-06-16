import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { buscarPrendas, PrendaCatalogo } from '../etiquetas.api';

interface Props {
  onSeleccionar: (prenda: PrendaCatalogo) => void;
}

export default function BuscadorPrendas({ onSeleccionar }: Props) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<PrendaCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    // debounce simple: espera 300ms después de dejar de escribir
    const timeout = setTimeout(async () => {
      if (termino.trim().length < 2) {
        setResultados([]);
        return;
      }
      setCargando(true);
      try {
        const data = await buscarPrendas(termino);
        setResultados(data);
      } catch (err) {
        console.error('Error buscando prendas:', err);
        setResultados([]);
      } finally {
        setCargando(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [termino]);

  return (
    <View>
      <TextInput
        value={termino}
        onChangeText={setTermino}
        placeholder="Buscar por nombre o marca..."
      />

      {cargando && <Text>Buscando...</Text>}

      {!cargando && termino.trim().length >= 2 && resultados.length === 0 && (
        <Text>Sin resultados. Puedes agregarla como manual.</Text>
      )}

      <FlatList
        data={resultados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSeleccionar(item)}>
            <Text>
              {item.nombre} — {item.marca_nombre} — ${item.precio}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
