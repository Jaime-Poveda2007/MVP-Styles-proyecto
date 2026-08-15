// src/features/perfil/PEditarPerfil.tsx
//
// RF-U10/RF-U11: edición de foto, nombre, username y biografía del
// perfil propio. Mismo patrón visual que PFormPrenda.tsx (selector de
// imagen galería/cámara + inputs con validación inline).
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, R } from '../../shared/theme';
import {
  obtenerPerfilPropio, actualizarPerfil,
  seleccionarFotoDePerfil, tomarFotoDePerfil,
  comprimirFotoDePerfil, subirFotoDePerfil, validarUsername, validarBiografia,
} from './perfil.api';
import { mostrarAlerta } from '../../lib/alerta';

interface Props {
  userId: string;
  onGuardado: () => void;
  onCancelar: () => void;
}

interface FormErrors { username?: string; biografia?: string }

export default function PEditarPerfil({ userId, onGuardado, onCancelar }: Props) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null); // nueva foto local, si se cambió
  const [fotoActualUrl, setFotoActualUrl] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [biografia, setBiografia] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    obtenerPerfilPropio(userId)
      .then(perfil => {
        setNombre(perfil.nombre);
        setUsername(perfil.username);
        setBiografia(perfil.biografia ?? '');
        setFotoActualUrl(perfil.foto_url);
      })
      .catch((e: any) => mostrarAlerta('Error', e.message ?? 'No se pudo cargar tu perfil.'))
      .finally(() => setCargando(false));
  }, [userId]);

  const elegirDeGaleria = async () => {
    try {
      const uri = await seleccionarFotoDePerfil();
      if (uri) setFotoUri(uri);
    } catch (e: any) { mostrarAlerta('Error', e.message); }
  };
  const usarCamara = async () => {
    try {
      const uri = await tomarFotoDePerfil();
      if (uri) setFotoUri(uri);
    } catch (e: any) { mostrarAlerta('Error', e.message); }
  };

  const validar = () => {
    const e: FormErrors = {};
    const eUsername = validarUsername(username); if (eUsername) e.username = eUsername;
    const eBio = validarBiografia(biografia); if (eBio) e.biografia = eBio;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      let fotoUrl: string | undefined;
      if (fotoUri) {
        const comprimida = await comprimirFotoDePerfil(fotoUri);
        fotoUrl = await subirFotoDePerfil(comprimida, userId);
      }
      // Una sola escritura atómica — si el username ya está en uso, no
      // queda nombre/biografía a medio guardar (ver perfil.api.ts).
      await actualizarPerfil(userId, { nombre, username, biografia, fotoUrl });
      onGuardado();
    } catch (e: any) {
      mostrarAlerta('Error al guardar', e.message ?? 'Algo salió mal.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centrado}><ActivityIndicator color={C.earth} /></View>
      </SafeAreaView>
    );
  }

  const fotoParaMostrar = fotoUri ?? fotoActualUrl;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.topBar}>
          <TouchableOpacity onPress={onCancelar}>
            <Text style={s.backText}>← Cancelar</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.titulo}>Editar perfil</Text>

        {fotoParaMostrar
          ? <Image source={{ uri: fotoParaMostrar }} style={s.avatar} />
          : <View style={[s.avatar, s.avatarVacio]}><Text style={{ color: C.muted }}>Sin foto</Text></View>
        }

        <View style={s.fila}>
          <TouchableOpacity style={s.botonSecundario} onPress={elegirDeGaleria}>
            <Text style={s.textoSecundario}>Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.botonSecundario} onPress={usarCamara}>
            <Text style={s.textoSecundario}>Cámara</Text>
          </TouchableOpacity>
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Nombre</Text>
          <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor={C.muted} value={nombre} onChangeText={setNombre} maxLength={80} />
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Nombre de usuario</Text>
          <TextInput
            style={[s.input, errors.username && s.inputError]}
            placeholder="usuario"
            placeholderTextColor={C.muted}
            value={username}
            onChangeText={(t) => { setUsername(t); if (errors.username) setErrors(prev => ({ ...prev, username: undefined })); }}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
          />
          {errors.username ? <Text style={s.errorText}>{errors.username}</Text> : null}
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Biografía</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Cuéntanos sobre tu estilo (máx. 150 caracteres)"
            placeholderTextColor={C.muted}
            value={biografia}
            onChangeText={(t) => { setBiografia(t.slice(0, 150)); if (errors.biografia) setErrors(prev => ({ ...prev, biografia: undefined })); }}
            multiline
            maxLength={150}
          />
          <Text style={s.contador}>{biografia.length}/150</Text>
          {errors.biografia ? <Text style={s.errorText}>{errors.biografia}</Text> : null}
        </View>

        <TouchableOpacity
          style={[s.botonPrincipal, guardando && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator color={C.white} />
            : <Text style={s.textoPrincipal}>Guardar cambios</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: C.white },
  centrado:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 20, gap: 14, paddingBottom: 48, alignItems: 'stretch' },
  topBar:       { paddingBottom: 4 },
  backText:     { fontSize: 14, color: C.earth, fontWeight: '500' },
  titulo:       { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 4 },
  avatar:       { width: 100, height: 100, borderRadius: 50, backgroundColor: C.earthLight, alignSelf: 'center' },
  avatarVacio:  { alignItems: 'center', justifyContent: 'center' },
  fila:         { flexDirection: 'row', gap: 12 },
  botonSecundario: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.btn, paddingVertical: 12, alignItems: 'center' },
  textoSecundario: { color: C.ink, fontWeight: '500' },
  campo:        { gap: 6 },
  label:        { fontSize: 13, fontWeight: '500', color: C.muted },
  input:        { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.ink },
  inputError:   { borderColor: C.error },
  textarea:     { minHeight: 80, textAlignVertical: 'top' },
  contador:     { alignSelf: 'flex-end', color: C.muted, fontSize: 12 },
  errorText:    { fontSize: 12, color: C.error },
  botonPrincipal: { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  textoPrincipal: { color: C.white, fontWeight: '700', fontSize: 16 },
});
