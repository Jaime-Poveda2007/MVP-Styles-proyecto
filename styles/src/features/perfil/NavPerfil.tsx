// src/features/perfil/NavPerfil.tsx
//
// RF-U10/RF-U11: stack del tab "Perfil" — perfil propio, edición de
// perfil, edición de preferencias de estilo y "Tus reposts".
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PPerfil from './PPerfil';
import PEditarPerfil from './PEditarPerfil';
import PEditarPreferencias from './PEditarPreferencias';
import PMisReposts from './PMisReposts';

export type PerfilStackParamList = {
  Perfil: undefined;
  EditarPerfil: undefined;
  EditarPreferencias: undefined;
  MisReposts: undefined;
};

const Stack = createNativeStackNavigator<PerfilStackParamList>();

interface Props {
  userId: string;
  onCerrarSesion: () => void;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
  // Antes Perfil era la raíz de su propio tab (sin "volver"). Ahora que
  // se navega acá desde el menú joystick de Feed, se necesita una
  // flecha de volver — opcional para no romper si en algún momento
  // vuelve a montarse como raíz de algo.
  onVolver?: () => void;
}

export default function NavPerfil({ userId, onCerrarSesion, onVerPerfil, onVolver }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Perfil">
        {({ navigation }) => (
          <PPerfil
            userId={userId}
            onEditarPerfil={() => navigation.navigate('EditarPerfil')}
            onEditarPreferencias={() => navigation.navigate('EditarPreferencias')}
            onMisReposts={() => navigation.navigate('MisReposts')}
            onCerrarSesion={onCerrarSesion}
            onVerPerfil={onVerPerfil}
            onVolver={onVolver}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="EditarPerfil">
        {({ navigation }) => (
          <PEditarPerfil
            userId={userId}
            onGuardado={() => navigation.goBack()}
            onCancelar={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="EditarPreferencias">
        {({ navigation }) => (
          <PEditarPreferencias userId={userId} onListo={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="MisReposts">
        {({ navigation }) => (
          <PMisReposts
            userId={userId}
            onVolver={() => navigation.goBack()}
            onVerPerfil={onVerPerfil}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
