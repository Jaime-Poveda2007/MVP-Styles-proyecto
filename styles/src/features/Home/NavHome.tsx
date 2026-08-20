// src/features/Home/NavHome.tsx
//
// Stack exterior de la sesión de usuario: los tabs (Feed/Perfil) más
// la pantalla de perfil público de otras personas (RF-U10), registrada
// acá arriba para que "navigate('PerfilPublico', ...)" funcione desde
// cualquier punto profundo de cualquiera de los dos tabs sin tener que
// pasar el objeto `navigation` crudo a componentes de presentación
// (FeedCard, PDetalle, ListaReseñas ya reciben solo un callback
// `onVerPerfil`, igual que el resto de callbacks de este codebase).
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NavTabs from './NavTabs';
import PPerfilPublico from '../perfil/PPerfilPublico';
import PPerfilPublicoMarca from '../marcas/screens/PPerfilPublicoMarca';
import { supabase } from '../../lib/supabase';

export type HomeStackParamList = {
  Tabs: undefined;
  PerfilPublico: { targetId: string; esDeMarca?: boolean };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

interface Props {
  userId: string;
  onCerrarSesion: () => void;
}

export default function HomeNavigator({ userId, onCerrarSesion }: Props) {
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    onCerrarSesion();
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs">
        {({ navigation }) => (
          <NavTabs
            userId={userId}
            onCerrarSesion={cerrarSesion}
            onVerPerfil={(targetId, esDeMarca) => navigation.navigate('PerfilPublico', { targetId, esDeMarca })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="PerfilPublico">
        {({ route, navigation }) => (
          route.params.esDeMarca ? (
            <PPerfilPublicoMarca
              targetMarcaId={route.params.targetId}
              userId={userId}
              onVolver={() => navigation.goBack()}
              onVerPerfil={(targetId, esDeMarca) => navigation.navigate('PerfilPublico', { targetId, esDeMarca })}
            />
          ) : (
            <PPerfilPublico
              targetUserId={route.params.targetId}
              userId={userId}
              onVolver={() => navigation.goBack()}
              onVerPerfil={(targetId, esDeMarca) => navigation.navigate('PerfilPublico', { targetId, esDeMarca })}
            />
          )
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
