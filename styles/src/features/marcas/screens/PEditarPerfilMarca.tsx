// src/features/marcas/screens/PEditarPerfilMarca.tsx
//
// Edición de logo, nombre, país, ciudad, categoría y descripción
// (bio) del perfil de marca — mismo patrón que PEditarPerfil.tsx de
// usuario (selector de imagen + inputs con validación inline +
// guardado atómico), combinado con los campos de ubicación/categoría
// tal como los captura PRegistroMarca.tsx.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/ThemeContext';
import {
  obtenerMarcaEditable, actualizarMarca, subirLogoDeMarca, validarDescripcionMarca,
  CATEGORIAS_MARCA, CategoriaMarca,
} from '../marcas.api';
import {
  seleccionarFotoDePerfil, tomarFotoDePerfil, comprimirFotoDePerfil,
} from '../../perfil/perfil.api';
import { mostrarAlerta } from '../../../lib/alerta';
import { conTimeout } from '../../../lib/conTimeout';

interface Props {
  marcaId: string;
  onGuardado: () => void;
  onCancelar: () => void;
}

interface FormErrors { nombre?: string; pais?: string; ciudad?: string; descripcion?: string }

export default function PEditarPerfilMarca({ marcaId, onGuardado, onCancelar }: Props) {
  const { C, R } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    safe:         { flex: 1, backgroundColor: C.white },
    centrado:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll:       { padding: 20, gap: 14, paddingBottom: 48, alignItems: 'stretch' },
    topBar:       { paddingBottom: 4 },
    backText:     { fontSize: 14, color: C.earth, fontWeight: '500' },
    titulo:       { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5, marginBottom: 4 },
    logo:         { width: 100, height: 100, borderRadius: 20, backgroundColor: C.earthLight, alignSelf: 'center' },
    logoVacio:    { alignItems: 'center', justifyContent: 'center' },
    fila:         { flexDirection: 'row', gap: 12 },
    filaDoble:    { flexDirection: 'row', gap: 12 },
    botonSecundario: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.btn, paddingVertical: 12, alignItems: 'center' },
    textoSecundario: { color: C.ink, fontWeight: '500' },
    campo:        { gap: 6 },
    label:        { fontSize: 13, fontWeight: '500', color: C.muted },
    input:        { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: R.input, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.ink },
    inputError:   { borderColor: C.error },
    textarea:     { minHeight: 80, textAlignVertical: 'top' },
    contador:     { alignSelf: 'flex-end', color: C.muted, fontSize: 12 },
    errorText:    { fontSize: 12, color: C.error },
    chipsFila:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.chip, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
    chipActivo:   { backgroundColor: C.earth, borderColor: C.earth },
    chipTexto:    { fontSize: 13, color: C.ink, fontWeight: '500' },
    chipTextoActivo: { color: C.white },
    botonPrincipal: { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    textoPrincipal: { color: C.white, fontWeight: '700', fontSize: 16 },
  }), [C, R]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null); // nuevo logo local, si se cambió
  const [logoActualUrl, setLogoActualUrl] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [categoria, setCategoria] = useState<CategoriaMarca | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    obtenerMarcaEditable(marcaId)
      .then(marca => {
        setNombre(marca.nombre);
        setPais(marca.pais);
        setCiudad(marca.ciudad);
        setCategoria(marca.categoria);
        setDescripcion(marca.descripcion ?? '');
        setLogoActualUrl(marca.logo_url);
      })
      .catch((e: any) => mostrarAlerta('Error', e.message ?? 'No se pudo cargar tu perfil.'))
      .finally(() => setCargando(false));
  }, [marcaId]);

  const elegirDeGaleria = async () => {
    try {
      const uri = await seleccionarFotoDePerfil();
      if (uri) setLogoUri(uri);
    } catch (e: any) { mostrarAlerta('Error', e.message); }
  };
  const usarCamara = async () => {
    try {
      const uri = await tomarFotoDePerfil();
      if (uri) setLogoUri(uri);
    } catch (e: any) { mostrarAlerta('Error', e.message); }
  };

  const validar = () => {
    const e: FormErrors = {};
    if (!nombre.trim() || nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres';
    if (!pais.trim()) e.pais = 'Ingresa el país';
    if (!ciudad.trim()) e.ciudad = 'Ingresa la ciudad';
    const eDesc = validarDescripcionMarca(descripcion); if (eDesc) e.descripcion = eDesc;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar() || !categoria) return;
    setGuardando(true);
    try {
      let logoUrl: string | undefined;
      if (logoUri) {
        const comprimido = await conTimeout(
          comprimirFotoDePerfil(logoUri),
          20000,
          'La imagen tardó demasiado en procesarse. Intenta con otra foto.'
        );
        logoUrl = await conTimeout(
          subirLogoDeMarca(comprimido, marcaId),
          20000,
          'La subida tardó demasiado. Revisa tu conexión e intenta de nuevo.'
        );
      }
      // Una sola escritura atómica (ver marcas.api.ts) — evita guardado
      // parcial si algo falla a mitad de camino.
      await actualizarMarca(marcaId, { nombre, pais, ciudad, categoria, descripcion, logoUrl });
      onGuardado();
    } catch (e: any) {
      console.error('Error al guardar perfil de marca:', e);
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

  const logoParaMostrar = logoUri ?? logoActualUrl;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.topBar}>
          <TouchableOpacity onPress={onCancelar}>
            <Text style={s.backText}>← Cancelar</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.titulo}>Editar perfil</Text>

        {logoParaMostrar
          ? <Image source={{ uri: logoParaMostrar }} style={s.logo} />
          : <View style={[s.logo, s.logoVacio]}><Text style={{ color: C.muted }}>Sin logo</Text></View>
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
          <Text style={s.label}>Nombre de la marca</Text>
          <TextInput
            style={[s.input, errors.nombre && s.inputError]}
            placeholder="Ej. Taller Andina"
            placeholderTextColor={C.muted}
            value={nombre}
            onChangeText={(t) => { setNombre(t); if (errors.nombre) setErrors(prev => ({ ...prev, nombre: undefined })); }}
            autoCapitalize="words"
            maxLength={80}
          />
          {errors.nombre ? <Text style={s.errorText}>{errors.nombre}</Text> : null}
        </View>

        <View style={s.filaDoble}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.label}>País</Text>
            <TextInput
              style={[s.input, errors.pais && s.inputError]}
              placeholder="Colombia"
              placeholderTextColor={C.muted}
              value={pais}
              onChangeText={(t) => { setPais(t); if (errors.pais) setErrors(prev => ({ ...prev, pais: undefined })); }}
              autoCapitalize="words"
              maxLength={56}
            />
            {errors.pais ? <Text style={s.errorText}>{errors.pais}</Text> : null}
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.label}>Ciudad</Text>
            <TextInput
              style={[s.input, errors.ciudad && s.inputError]}
              placeholder="Bogotá"
              placeholderTextColor={C.muted}
              value={ciudad}
              onChangeText={(t) => { setCiudad(t); if (errors.ciudad) setErrors(prev => ({ ...prev, ciudad: undefined })); }}
              autoCapitalize="words"
              maxLength={85}
            />
            {errors.ciudad ? <Text style={s.errorText}>{errors.ciudad}</Text> : null}
          </View>
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Categoría</Text>
          <View style={s.chipsFila}>
            {CATEGORIAS_MARCA.map(cat => {
              const activo = categoria === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategoria(cat)}
                  style={[s.chip, activo && s.chipActivo]}
                >
                  <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{cat}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.campo}>
          <Text style={s.label}>Descripción</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Cuéntanos sobre tu marca (máx. 150 caracteres)"
            placeholderTextColor={C.muted}
            value={descripcion}
            onChangeText={(t) => { setDescripcion(t.slice(0, 150)); if (errors.descripcion) setErrors(prev => ({ ...prev, descripcion: undefined })); }}
            multiline
            maxLength={150}
          />
          <Text style={s.contador}>{descripcion.length}/150</Text>
          {errors.descripcion ? <Text style={s.errorText}>{errors.descripcion}</Text> : null}
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
