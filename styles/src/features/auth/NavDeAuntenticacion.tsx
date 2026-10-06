// src/features/auth/NavDeAuntenticacion.tsx
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BienvenidaScreen from './screens/PBienvenida';
import LoginScreen from './screens/PLogin';
import RegisterScreen from './screens/PRegistro';
import EmailConfirmationScreen from './screens/PEmailConfirmacion';
import ForgotPasswordScreen from './screens/PRecuperarPassword';
import ResetPasswordScreen from './screens/PResetPassword';
import OnboardingEstiloScreen from './screens/POnboardingEstilo';
import LoginMarcaScreen from '../marcas/screens/PLoginMarca';
import RegistroMarcaScreen from '../marcas/screens/PRegistroMarca';
import PendienteAprobacionScreen from '../marcas/screens/PPendienteAprobacion';
import { EstadoMarca } from '../../lib/marcaPerfil';
import { debeMostrarBienvenida } from '../../lib/bienvenida';
import { C } from '../../shared/theme';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { onLoginExitoso: () => void } | undefined;
  Register: undefined;
  EmailConfirmation: { email: string; enviarCodigo?: boolean };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
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
  // Solo cuando se entra sin sesión (ruta por defecto 'Login') se decide si mostrar
  // la bienvenida; en los demás casos (onboarding, marca pendiente) se respeta la ruta.
  const [rutaInicial, setRutaInicial] = useState<keyof AuthStackParamList | null>(
    initialRoute === 'Login' ? null : initialRoute,
  );

  useEffect(() => {
    if (initialRoute !== 'Login') return;
    let vivo = true;
    debeMostrarBienvenida().then(mostrar => { if (vivo) setRutaInicial(mostrar ? 'Welcome' : 'Login'); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rutaInicial) return <View style={{ flex: 1, backgroundColor: C.white }} />;

  return (
    <Stack.Navigator
      initialRouteName={rutaInicial}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={BienvenidaScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        initialParams={{ onLoginExitoso }}
      />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
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