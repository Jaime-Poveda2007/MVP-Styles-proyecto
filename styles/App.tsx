// App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { asegurarPerfilUsuario } from './src/lib/perfil';
import { asegurarPerfilMarca, esCuentaDeMarca, EstadoMarca } from './src/lib/marcaPerfil';
import AuthNavigator from './src/features/auth/NavDeAuntenticacion';
import HomeScreen from './src/features/Home/NavHome';
import NavMarcas from './src/features/marcas/NavMarcas';
import AlertaHost from './src/shared/components/AlertaHost';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/shared/ThemeContext';

type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  HomeMarca: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

// RF-M01: además de los estados de usuario, la sesión puede pertenecer
// a una marca, que puede estar 'pendiente'/'rechazada' (bloqueada, solo
// ve la pantalla de espera) o 'aprobada' (entra al panel de catálogo).
type EstadoApp =
  | 'cargando'
  | 'sin-sesion'
  | 'onboarding-pendiente'
  | 'listo'
  | 'marca-bloqueada'
  | 'marca-lista';

function AppInterna() {
  const { scheme, C } = useTheme();
  const [estado, setEstado] = useState<EstadoApp>('cargando');
  const [userId, setUserId] = useState<string | null>(null);
  const [marcaId, setMarcaId] = useState<string | null>(null);
  const [marcaBloqueada, setMarcaBloqueada] = useState<{ nombreMarca: string; estado: EstadoMarca } | null>(null);

  const evaluarSesion = async (session: Session | null) => {
    if (!session) {
      setEstado('sin-sesion');
      return;
    }
    try {
      if (esCuentaDeMarca(session)) {
        const marca = await asegurarPerfilMarca(session);
        if (marca.estado === 'aprobada') {
          setMarcaId(marca.id);
          setEstado('marca-lista');
        } else {
          setMarcaBloqueada({ nombreMarca: marca.nombre, estado: marca.estado });
          setEstado('marca-bloqueada');
        }
        return;
      }

      const perfil = await asegurarPerfilUsuario(session);
      setUserId(perfil.id);
      setEstado(perfil.onboardingCompleto ? 'listo' : 'onboarding-pendiente');
    } catch {
      // Si falla la creación/lectura del perfil, no dejamos a la persona
      // atrapada en el splash: la mandamos a iniciar sesión de nuevo.
      setEstado('sin-sesion');
    }
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

  // Tema de React Navigation (color de fondo entre pantallas durante
  // transiciones) — sigue el mismo modo que el resto de la app.
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: C.white,
      card: C.white,
      text: C.ink,
      border: C.border,
      primary: C.earth,
    },
  };

  if (estado === 'cargando') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.white }}>
        <ActivityIndicator color={C.earth} />
        <AlertaHost />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <NavigationContainer theme={navTheme}>
          <AlertaHost />
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {estado === 'listo' ? (
              <RootStack.Screen name="Home">
                {() => (
                  <HomeScreen
                    userId={userId ?? ''}
                    onCerrarSesion={() => setEstado('sin-sesion')}
                  />
                )}
              </RootStack.Screen>
            ) : estado === 'marca-lista' ? (
              <RootStack.Screen name="HomeMarca">
                {() => (
                  <NavMarcas
                    marcaId={marcaId ?? ''}
                    onCerrarSesion={async () => {
                      await supabase.auth.signOut();
                      setEstado('sin-sesion');
                    }}
                  />
                )}
              </RootStack.Screen>
            ) : (
              <RootStack.Screen name="Auth">
                {() => (
                  <AuthNavigator
                    initialRoute={
                      estado === 'onboarding-pendiente' ? 'OnboardingEstilo' :
                        estado === 'marca-bloqueada' ? 'MarcaPendienteAprobacion' :
                          'Login'
                    }
                    onboardingParams={
                      estado === 'onboarding-pendiente' && userId
                        ? { userId, onComplete: () => setEstado('listo') }
                        : undefined
                    }
                    marcaPendienteParams={
                      estado === 'marca-bloqueada' && marcaBloqueada
                        ? marcaBloqueada
                        : undefined
                    }
                    onLoginExitoso={() => setEstado('listo')}
                    onLoginExitosoMarca={() => setEstado('marca-lista')}
                  />
                )}
              </RootStack.Screen>
            )}
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInterna />
    </ThemeProvider>
  );
}
