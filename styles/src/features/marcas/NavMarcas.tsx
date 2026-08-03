// src/features/marcas/NavMarcas.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PCatalogo from './catalogo/screens/PCatalogo';
import PFormPrenda from './catalogo/screens/PFormPrenda';
import PCrearPublicacionMarca from './publicaciones/PCrearPublicacionMarca';
import PMetricasMarca from './metricas/PMetricasMarca';
import { Prenda } from './catalogo/types';

export type MarcasStackParamList = {
  Catalogo: undefined;
  FormPrenda: { prenda?: Prenda } | undefined;
  CrearPublicacion: undefined;
  MetricasMarca: undefined;
};

const Stack = createNativeStackNavigator<MarcasStackParamList>();

interface Props {
  marcaId: string;
  onCerrarSesion: () => void;
}

export default function NavMarcas({ marcaId, onCerrarSesion }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Catalogo">
        {({ navigation }) => (
          <PCatalogo
            onCrear={() => navigation.navigate('FormPrenda', {})}
            onEditar={(prenda) => navigation.navigate('FormPrenda', { prenda })}
            onCrearPublicacion={() => navigation.navigate('CrearPublicacion')}
            onVerMetricas={() => navigation.navigate('MetricasMarca')}
            onCerrarSesion={onCerrarSesion}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="MetricasMarca">
        {({ navigation }) => (
          <PMetricasMarca marcaId={marcaId} onVolver={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="FormPrenda">
        {({ navigation, route }) => (
          <PFormPrenda
            marcaId={marcaId}
            prenda={route.params?.prenda}
            onGuardado={() => navigation.goBack()}
            onCancelar={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CrearPublicacion">
        {({ navigation }) => (
          <PCrearPublicacionMarca
            marcaId={marcaId}
            onPublicado={() => navigation.navigate('Catalogo')}
            onCancelar={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
