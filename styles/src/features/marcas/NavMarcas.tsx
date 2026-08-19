// src/features/marcas/NavMarcas.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Store, Compass } from 'lucide-react-native';
import NavMarcasPanel from './NavMarcasPanel';
import FeedNavigator from '../feed/NavFeed';
import { C } from '../../shared/theme';

export type MarcasTabsParamList = {
  PanelTab: undefined;
  FeedTab: undefined;
};

const Tab = createBottomTabNavigator<MarcasTabsParamList>();

interface Props {
  marcaId: string;
  onCerrarSesion: () => void;
}

export default function NavMarcas({ marcaId, onCerrarSesion }: Props) {
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
            onVerPerfil={(targetUserId) => console.log('Ver perfil (no implementado para marca todavía):', targetUserId)}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
