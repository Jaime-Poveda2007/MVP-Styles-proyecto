// src/features/auth/NavDeAuntenticacion.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/PLogin';
import RegisterScreen from './screens/PRegistro';
import EmailConfirmationScreen from './screens/PEmailConfirmacion';
import ForgotPasswordScreen from './screens/PRecuperarPassword';
import OnboardingEstiloScreen from './screens/POnboardingEstilo';
import LoginMarcaScreen from '../marcas/screens/PLoginMarca';
import RegistroMarcaScreen from '../marcas/screens/PRegistroMarca';
import PendienteAprobacionScreen from '../marcas/screens/PPendienteAprobacion';
import { EstadoMarca } from '../../lib/marcaPerfil';

export type AuthStackParamList = {
  Login: { onLoginExitoso: () => void } | undefined;
  Register: undefined;
  EmailConfirmation: { email: string };
  ForgotPassword: undefined;
  OnboardingEstilo: { userId: string; onComplete: () => void };
  // ── Rutas de marca (RF-M01) ──────────────────────────────────────────
  LoginMarca: { onLoginExitosoMarca: () => void } | undefined;
  RegisterMarca: undefined;
  MarcaPendienteAprobacion: { nombreMarca: string; estado: EstadoMarca } | undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>(); // ← esta línea faltaba

interface Props {
  initialRoute?: keyof AuthStackParamList;
  onboardingParams?: { userId: string; onComplete: () => void };
  onLoginExitoso?: () => void;
  onLoginExitosoMarca?: () => void;
  marcaPendienteParams?: { nombreMarca: string; estado: EstadoMarca };
}

export default function AuthNavigator({
  initialRoute = 'Login',
  onboardingParams,
  onLoginExitoso,
  onLoginExitosoMarca,
  marcaPendienteParams,
}: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        initialParams={{ onLoginExitoso }}
      />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="OnboardingEstilo"
        component={OnboardingEstiloScreen}
        initialParams={onboardingParams}
        options={{ gestureEnabled: false }}
      />

      {/* ── Marca (RF-M01) ──────────────────────────────────────────── */}
      <Stack.Screen
        name="LoginMarca"
        component={LoginMarcaScreen}
        initialParams={{ onLoginExitosoMarca }}
      />
      <Stack.Screen name="RegisterMarca" component={RegistroMarcaScreen} />
      <Stack.Screen
        name="MarcaPendienteAprobacion"
        component={PendienteAprobacionScreen}
        initialParams={marcaPendienteParams}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}