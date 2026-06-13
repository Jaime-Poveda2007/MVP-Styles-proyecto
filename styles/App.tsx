// App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import AuthNavigator from './src/features/auth/NavDeAuntenticacion';
import HomeScreen from './src/features/Home/NavHome';

type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

type EstadoApp = 'cargando' | 'sin-sesion' | 'onboarding-pendiente' | 'listo';

export default function App() {
  const [estado, setEstado] = useState<EstadoApp>('cargando');
  const [userId, setUserId] = useState<string | null>(null);

  const evaluarSesion = async (session: Session | null) => {
    if (!session) {
      setEstado('sin-sesion');
      return;
    }
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('onboarding_completo')
      .eq('id', session.user.id)
      .single();

    setUserId(session.user.id);
    setEstado(perfil?.onboarding_completo ? 'listo' : 'onboarding-pendiente');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      evaluarSesion(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluarSesion(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (estado === 'cargando') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {estado === 'listo' ? (
            <RootStack.Screen name="Home">
              {() => <HomeScreen onCerrarSesion={() => setEstado('sin-sesion')} />}
            </RootStack.Screen>
          ) : (
            <RootStack.Screen name="Auth">
              {() => (
                <AuthNavigator
                  initialRoute={estado === 'onboarding-pendiente' ? 'OnboardingEstilo' : 'Login'}
                  onboardingParams={
                    estado === 'onboarding-pendiente' && userId
                      ? { userId, onComplete: () => setEstado('listo') }
                      : undefined
                  }
                  onLoginExitoso={() => setEstado('listo')}
                />
              )}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}