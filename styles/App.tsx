import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import AuthNavigator from './src/features/auth/NavDeAuntenticacion';
//import HomeNavigator from './src/features/home/NavHome';

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
        {estado === 'sin-sesion' && <AuthNavigator />}
        {estado === 'onboarding-pendiente' && userId && (
          <AuthNavigator
            initialRoute="OnboardingEstilo"
            onboardingParams={{
              userId,
              onComplete: () => setEstado('listo'),
            }}
          />
        )}
      //-{estado === 'listo' && <AuthNavigator/>}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}