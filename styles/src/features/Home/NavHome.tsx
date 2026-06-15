import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import PCrearPublicacion from '../feed/screens/PCrearPublicacion';

type HomeStack = { Home: undefined; CrearPublicacion: undefined };
const Stack = createNativeStackNavigator<HomeStack>();

function HomePlaceholder({ onCerrarSesion }: { onCerrarSesion: () => void }) {
  const navigation = useNavigation<any>();

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    onCerrarSesion();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>🏠 Home</Text>
      <Text style={styles.subtitulo}>Feed en desarrollo</Text>
      <TouchableOpacity style={styles.boton} onPress={() => navigation.navigate('CrearPublicacion')}>
        <Text>+ Nueva publicación</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.boton} onPress={cerrarSesion}>
        <Text>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeNavigator({ onCerrarSesion }: { onCerrarSesion: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home">
        {() => <HomePlaceholder onCerrarSesion={onCerrarSesion} />}
      </Stack.Screen>
      <Stack.Screen name="CrearPublicacion">
        {({ navigation }) => (
          <PCrearPublicacion onPublicado={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  titulo:     { fontSize: 28, fontWeight: '700' },
  subtitulo:  { fontSize: 15, color: '#888', marginBottom: 24 },
  boton:      { borderWidth: 1, padding: 12, borderRadius: 8 },
});
