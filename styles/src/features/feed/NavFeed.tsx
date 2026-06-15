import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PCrearPublicacion from './screens/PCrearPublicacion';

export type FeedStackParamList = {
  CrearPublicacion: undefined;
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export default function FeedNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CrearPublicacion">
        {({ navigation }) => (
          <PCrearPublicacion onPublicado={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
