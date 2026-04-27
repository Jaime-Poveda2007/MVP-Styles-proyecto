import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RegisterScreen from './screens/PRegistro';
import EmailConfirmationScreen from './screens/PEmailConfirmacion';
import LoginScreen from './screens/PLogin';
import ForgotPasswordScreen from './screens/PRecuperarPassword';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  EmailConfirmation: { email: string };
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}