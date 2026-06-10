// src/features/auth/NavDeAuntenticacion.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/PLogin';
import RegisterScreen from './screens/PRegistro';
import EmailConfirmationScreen from './screens/PEmailConfirmacion';
import ForgotPasswordScreen from './screens/PRecuperarPassword';
import OnboardingEstiloScreen from './screens/POnboardingEstilo';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  EmailConfirmation: { email: string };
  ForgotPassword: undefined;
  OnboardingEstilo: {
    userId: string;
    onComplete: () => void; // ← se pasa como param
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface Props {
  initialRoute?: keyof AuthStackParamList;
  onboardingParams?: {
    userId: string;
    onComplete: () => void;
  };
}

export default function AuthNavigator({ initialRoute = 'Login', onboardingParams }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="OnboardingEstilo"
        component={OnboardingEstiloScreen}
        initialParams={onboardingParams}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}