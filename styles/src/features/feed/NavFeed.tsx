// src/features/feed/NavFeed.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PCrearPublicacion from './screens/PCrearPublicacion';
import PFeed from './PFeed';
import PBusqueda from '../busqueda/PBusqueda';

export type FeedStackParamList = {
  Feed: { userId: string };
  CrearPublicacion: undefined;
  Busqueda: { terminoInicial?: string; userId: string };
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

interface Props {
  userId: string;
  onCerrarSesion: () => void;
}

export default function FeedNavigator({ userId, onCerrarSesion }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed">
        {() => <PFeed userId={userId} onCerrarSesion={onCerrarSesion} />}
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
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}