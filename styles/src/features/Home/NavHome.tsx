// src/features/Home/NavHome.tsx
//
// Stack exterior de la sesión de usuario: el feed (con Buscar,
// Notificaciones y Perfil propio ya integrados en su menú joystick,
// ver PFeed.tsx/JoystickMenu.tsx) más la pantalla de perfil público de
// otras personas (RF-U10), registrada acá arriba para que
// "navigate('PerfilPublico', ...)" funcione desde cualquier punto
// profundo del feed sin tener que pasar el objeto `navigation` crudo a
// componentes de presentación (FeedCard, PDetalle, ListaReseñas ya
// reciben solo un callback `onVerPerfil`, igual que el resto de
// callbacks de este codebase).
//
// Antes acá vivía un Tab.Navigator (NavTabs) con los tabs Feed/Perfil;
// se eliminó porque Perfil ahora se abre desde el joystick del feed
// con una flecha de "volver" normal, no como tab independiente.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeedNavigator from '../feed/NavFeed';
import PPerfilPublico from '../perfil/PPerfilPublico';
import PPerfilPublicoMarca from '../marcas/screens/PPerfilPublicoMarca';
import { supabase } from '../../lib/supabase';

export type HomeStackParamList = {
  Feed: undefined;
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
      <Stack.Screen name="Feed">
        {({ navigation }) => (
          <FeedNavigator
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
