// src/features/feed/NavFeed.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PCrearPublicacion from './screens/PCrearPublicacion';
import PFeed from './PFeed';
import PBusqueda from '../busqueda/PBusqueda';
import PNotificaciones from '../notificaciones/PNotificaciones';
import NavPerfil from '../perfil/NavPerfil';

export type FeedStackParamList = {
  Feed: { userId: string };
  CrearPublicacion: undefined;
  Busqueda: { terminoInicial?: string; userId: string };
  Notificaciones: undefined;
  // Perfil propio: antes vivía en su propio tab (NavTabs); ahora se
  // navega acá desde el menú joystick de PFeed, con una flecha de
  // "volver" normal para regresar al feed (ver onVolver en NavPerfil).
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

interface Props {
  userId: string;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
  onCerrarSesion: () => void;
  esDeMarca?: boolean;
}

export default function FeedNavigator({ userId, onVerPerfil, onCerrarSesion, esDeMarca = false }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed">
        {() => <PFeed userId={userId} onVerPerfil={onVerPerfil} esDeMarca={esDeMarca} />}
      </Stack.Screen>
      <Stack.Screen name="CrearPublicacion">
        {({ navigation }) => (
          <PCrearPublicacion onPublicado={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Busqueda">
        {({ navigation, route }) => (
          <PBusqueda
            userId={userId}
            terminoInicial={route.params?.terminoInicial}
            onVolver={() => navigation.goBack()}
            esDeMarca={esDeMarca}
            onVerPerfil={onVerPerfil}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Notificaciones">
        {({ navigation }) => (
          <PNotificaciones
            userId={userId}
            esDeMarca={esDeMarca}
            onVolver={() => navigation.goBack()}
            onVerPerfil={onVerPerfil}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Perfil">
        {({ navigation }) => (
          <NavPerfil
            userId={userId}
            onCerrarSesion={onCerrarSesion}
            onVerPerfil={onVerPerfil}
            onVolver={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}