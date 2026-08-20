// src/features/marcas/NavMarcas.tsx
//
// Stack exterior de la sesión de marca: los tabs (Panel/Feed) más la
// pantalla de perfil público (de usuario o de otra marca), registrada
// acá arriba para que "navigate('PerfilPublico', ...)" funcione desde
// cualquier punto profundo de los tabs — mismo patrón que NavHome.tsx
// usa para la sesión de usuario.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NavMarcasTabs from './NavMarcasTabs';
import PPerfilPublico from '../perfil/PPerfilPublico';
import PPerfilPublicoMarca from './screens/PPerfilPublicoMarca';

export type MarcasStackParamList = {
  Tabs: undefined;
  PerfilPublico: { targetId: string; esDeMarca?: boolean };
};

const Stack = createNativeStackNavigator<MarcasStackParamList>();

interface Props {
  marcaId: string;
  onCerrarSesion: () => void;
}

export default function NavMarcas({ marcaId, onCerrarSesion }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs">
        {({ navigation }) => (
          <NavMarcasTabs
            marcaId={marcaId}
            onCerrarSesion={onCerrarSesion}
            onVerPerfil={(targetId, esDeMarca) => navigation.navigate('PerfilPublico', { targetId, esDeMarca })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="PerfilPublico">
        {({ route, navigation }) => (
          route.params.esDeMarca ? (
            <PPerfilPublicoMarca
              targetMarcaId={route.params.targetId}
              userId={marcaId}
              esDeMarca
              onVolver={() => navigation.goBack()}
              onVerPerfil={(targetId, esDeMarca) => navigation.navigate('PerfilPublico', { targetId, esDeMarca })}
            />
          ) : (
            <PPerfilPublico
              targetUserId={route.params.targetId}
              userId={marcaId}
              esDeMarca
              onVolver={() => navigation.goBack()}
              onVerPerfil={(targetId, esDeMarca) => navigation.navigate('PerfilPublico', { targetId, esDeMarca })}
            />
          )
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
