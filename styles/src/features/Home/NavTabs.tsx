// src/features/Home/NavTabs.tsx
//
// Bottom tabs: Feed / Perfil. Reemplaza el botón de logout temporal
// que vivía en PFeed.tsx (ver comentario histórico "en Mes 3 pasa al
// tab de Perfil" en ese archivo) — ahora cerrar sesión vive en PPerfil.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Compass, CircleUserRound } from 'lucide-react-native';
import FeedNavigator from '../feed/NavFeed';
import NavPerfil from '../perfil/NavPerfil';
import { C } from '../../shared/theme';

export type TabsParamList = {
  FeedTab: undefined;
  PerfilTab: undefined;
};

const Tab = createBottomTabNavigator<TabsParamList>();

interface Props {
  userId: string;
  onCerrarSesion: () => void;
  onVerPerfil: (targetId: string, esDeMarca?: boolean) => void;
}

export default function NavTabs({ userId, onCerrarSesion, onVerPerfil }: Props) {
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
        name="FeedTab"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} strokeWidth={2} />,
        }}
      >
        {() => <FeedNavigator userId={userId} onVerPerfil={onVerPerfil} />}
      </Tab.Screen>
      <Tab.Screen
        name="PerfilTab"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <CircleUserRound size={size} color={color} strokeWidth={2} />,
        }}
      >
        {() => <NavPerfil userId={userId} onCerrarSesion={onCerrarSesion} onVerPerfil={onVerPerfil} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
