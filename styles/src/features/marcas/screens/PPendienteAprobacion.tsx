// src/features/marcas/screens/PPendienteAprobacion.tsx
//
// RF-M01: "Bloqueo de acceso hasta aprobación manual". Esta pantalla es
// lo único que puede ver una marca autenticada mientras su estado en
// public.marcas no sea 'aprobada'. No hay forma de llegar al panel de
// catálogo desde acá salvo cerrando sesión y volviendo a entrar una vez
// el equipo de Styles apruebe la marca (estado pasa a 'aprobada').

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../auth/NavDeAuntenticacion';
import { supabase } from '../../../lib/supabase';
import { C, R } from '../../../shared/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'MarcaPendienteAprobacion'>;

export default function PPendienteAprobacion({ route, navigation }: Props) {
  const { nombreMarca, estado } = route.params ?? { nombreMarca: 'tu marca', estado: 'pendiente' as const };
  const esRechazada = estado === 'rechazada';

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={[s.iconWrap, esRechazada && s.iconWrapError]}>
          <Text style={s.iconEmoji}>{esRechazada ? '⚠️' : '⏳'}</Text>
        </View>

        <Text style={s.eyebrow}>{esRechazada ? 'Solicitud no aprobada' : 'Solicitud en revisión'}</Text>
        <Text style={s.titulo}>{nombreMarca}</Text>

        {esRechazada ? (
          <Text style={s.subtitulo}>
            Tu solicitud de registro no fue aprobada por el equipo de Styles.
            Si crees que esto es un error, contáctanos respondiendo al correo
            de confirmación que recibiste al registrarte.
          </Text>
        ) : (
          <Text style={s.subtitulo}>
            Tu marca está pendiente de aprobación manual. En cuanto el equipo
            de Styles la revise, te avisaremos por correo y podrás acceder al
            panel de catálogo y publicaciones.
          </Text>
        )}

        <TouchableOpacity style={s.btnGhost} onPress={cerrarSesion} activeOpacity={0.85}>
          <Text style={s.btnGhostText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.white },
  container:      { flex: 1, paddingHorizontal: 32, paddingTop: 80, alignItems: 'center' },
  iconWrap:       { width: 80, height: 80, borderRadius: 24, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  iconWrapError:  { backgroundColor: C.errorLight },
  iconEmoji:      { fontSize: 36 },
  eyebrow:        { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: C.earth, marginBottom: 8, textAlign: 'center' },
  titulo:         { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 16, textAlign: 'center' },
  subtitulo:      { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  btnGhost:       { borderRadius: R.btn, borderWidth: 1.5, borderColor: C.border, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  btnGhostText:   { fontSize: 15, color: C.ink, fontWeight: '600' },
});
