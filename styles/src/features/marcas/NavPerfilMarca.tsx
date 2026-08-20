// src/features/marcas/NavPerfilMarca.tsx
//
// Stack privado del tab "Mi perfil" de la sesión de marca — perfil
// propio editable, calcado de src/features/perfil/NavPerfil.tsx. No
// maneja onCerrarSesion (se queda en el Panel/PCatalogo.tsx).
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PPerfilMarca from './screens/PPerfilMarca';
import PEditarPerfilMarca from './screens/PEditarPerfilMarca';

export type PerfilMarcaStackParamList = {
  Perfil: undefined;
  EditarPerfil: undefined;
};

const Stack = createNativeStackNavigator<PerfilMarcaStackParamList>();

interface Props {
  marcaId: string;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
}

export default function NavPerfilMarca({ marcaId, onVerPerfil }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Perfil">
        {({ navigation }) => (
          <PPerfilMarca
            marcaId={marcaId}
            onEditarPerfil={() => navigation.navigate('EditarPerfil')}
            onVerPerfil={onVerPerfil}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="EditarPerfil">
        {({ navigation }) => (
          <PEditarPerfilMarca
            marcaId={marcaId}
            onGuardado={() => navigation.goBack()}
            onCancelar={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
