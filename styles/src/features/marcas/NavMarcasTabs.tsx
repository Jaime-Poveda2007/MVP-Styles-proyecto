// src/features/marcas/NavMarcasTabs.tsx
//
// Bottom tabs de la sesión de marca: Panel (gestión interna) / Feed
// (feed general, con acceso a Buscar). Extraído de NavMarcas.tsx, que
// ahora es el stack exterior que también hospeda PerfilPublico —
// mismo split que NavHome.tsx hace con NavTabs.tsx.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Store, Compass, CircleUserRound } from 'lucide-react-native';
import NavMarcasPanel from './NavMarcasPanel';
import FeedNavigator from '../feed/NavFeed';
import NavPerfilMarca from './NavPerfilMarca';
import { C } from '../../shared/theme';

export type MarcasTabsParamList = {
  PanelTab: undefined;
  FeedTab: undefined;
  PerfilTab: undefined;
};

const Tab = createBottomTabNavigator<MarcasTabsParamList>();

interface Props {
  marcaId: string;
  onCerrarSesion: () => void;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
}

export default function NavMarcasTabs({ marcaId, onCerrarSesion, onVerPerfil }: Props) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.earth,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { borderTopColor: C.border },
      }}
    >
      <Tab.Screen
        name="PanelTab"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color, size }) => <Store size={size} color={color} strokeWidth={2} />,
        }}
      >
        {() => <NavMarcasPanel marcaId={marcaId} onCerrarSesion={onCerrarSesion} />}
      </Tab.Screen>
      <Tab.Screen
        name="FeedTab"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} strokeWidth={2} />,
        }}
      >
        {() => (
          <FeedNavigator
            userId={marcaId}
            esDeMarca
            onVerPerfil={onVerPerfil}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="PerfilTab"
        options={{
          title: 'Mi perfil',
          tabBarIcon: ({ color, size }) => <CircleUserRound size={size} color={color} strokeWidth={2} />,
        }}
      >
        {() => <NavPerfilMarca marcaId={marcaId} onVerPerfil={onVerPerfil} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
