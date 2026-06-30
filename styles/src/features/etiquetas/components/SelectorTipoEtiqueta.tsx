import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import BuscadorPrendas from './BuscadorPrendas';
import SelectorEstilo from './SelectorEstilo';
import { useEstilos } from '../hooks/useEstilos';

interface Props {
  onCerrar: () => void;
  onSeleccionarCatalogo: (prendaId: string, prendaNombre: string, estiloId: string | null) => void;
  onSeleccionarManual: (
    nombreManual: string,
    marcaManual?: string,
    precioManual?: number,
    estiloId?: string | null
  ) => void;
}

type Modo = 'elegir' | 'catalogo' | 'manual';

export default function SelectorTipoEtiqueta({
  onCerrar,
  onSeleccionarCatalogo,
  onSeleccionarManual,
}: Props) {
  const [modo, setModo] = useState<Modo>('elegir');
  const [nombreManual, setNombreManual] = useState('');
  const [marcaManual, setMarcaManual] = useState('');
  const [precioManual, setPrecioManual] = useState('');
  const [estiloId, setEstiloId] = useState<string | null>(null);

  const { estilos, loading: loadingEstilos } = useEstilos();

  function enviarManual() {
    if (nombreManual.trim().length === 0) return;
    const precio = precioManual ? Number(precioManual) : undefined;
    onSeleccionarManual(nombreManual.trim(), marcaManual.trim() || undefined, precio, estiloId);
  }

  return (
    <View>
      <Pressable onPress={onCerrar}>
        <Text>Cancelar</Text>
      </Pressable>

      {modo === 'elegir' && (
        <View>
          <Text>¿Qué tipo de etiqueta quieres agregar?</Text>
          <Pressable onPress={() => setModo('catalogo')}>
            <Text>Buscar en catálogo</Text>
          </Pressable>
          <Pressable onPress={() => setModo('manual')}>
            <Text>Agregar prenda manual</Text>
          </Pressable>
        </View>
      )}

      {modo === 'catalogo' && (
        <View>
          <BuscadorPrendas
            onSeleccionar={(prenda) =>
              onSeleccionarCatalogo(prenda.id, prenda.nombre, estiloId)
            }
          />
          <SelectorEstilo
            estilos={estilos}
            loading={loadingEstilos}
            seleccionado={estiloId}
            onSeleccionar={setEstiloId}
          />
          <Pressable onPress={() => setModo('elegir')}>
            <Text>Volver</Text>
          </Pressable>
        </View>
      )}

      {modo === 'manual' && (
        <View>
          <Text>Nombre de la prenda</Text>
          <TextInput
            value={nombreManual}
            onChangeText={setNombreManual}
            placeholder="Ej: Chaqueta de cuero"
          />

          <Text>Marca (opcional)</Text>
          <TextInput
            value={marcaManual}
            onChangeText={setMarcaManual}
            placeholder="Ej: Zara"
          />

          <Text>Precio (opcional)</Text>
          <TextInput
            value={precioManual}
            onChangeText={setPrecioManual}
            placeholder="Ej: 120000"
            keyboardType="numeric"
          />

          <SelectorEstilo
            estilos={estilos}
            loading={loadingEstilos}
            seleccionado={estiloId}
            onSeleccionar={setEstiloId}
          />

          <Pressable onPress={enviarManual}>
            <Text>Confirmar etiqueta manual</Text>
          </Pressable>
          <Pressable onPress={() => setModo('elegir')}>
            <Text>Volver</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
