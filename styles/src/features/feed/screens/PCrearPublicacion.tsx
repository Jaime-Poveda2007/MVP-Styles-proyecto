import React, { useState } from 'react';
import {
    View, Text, TextInput, Image, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { C, R } from '../../../shared/theme';
import {
    seleccionarDeGaleria,
    tomarFoto,
    comprimirSiEsNecesario,
    subirImagen,
    crearPublicacion,
} from '../services/publicacionesService';

interface Props {
    onPublicado: () => void;
}

export default function PCrearPublicacion({ onPublicado }: Props) {
    const [imagenUri, setImagenUri] = useState<string | null>(null);
    const [descripcion, setDescripcion] = useState('');
    const [cargando, setCargando] = useState(false);

    const elegirDeGaleria = async () => {
        try {
            const uri = await seleccionarDeGaleria();
            if (uri) setImagenUri(uri);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const usarCamara = async () => {
        try {
            const uri = await tomarFoto();
            if (uri) setImagenUri(uri);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const publicar = async () => {
        if (!imagenUri) {
            Alert.alert('Falta imagen', 'Selecciona o toma una foto del outfit.');
            return;
        }
        setCargando(true);
        try {
            const uriFinal = await comprimirSiEsNecesario(imagenUri);
            const url = await subirImagen(uriFinal);
            await crearPublicacion(url, descripcion);

            setImagenUri(null);
            setDescripcion('');
            onPublicado();
        } catch (e: any) {
            Alert.alert('Error al publicar', e.message ?? 'Algo salió mal.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>

            <TouchableOpacity onPress={onPublicado}>
                <Text>← Volver</Text>
            </TouchableOpacity>

            <Text style={styles.titulo}>Nueva publicación</Text>

            {imagenUri ? (
                <Image source={{ uri: imagenUri }} style={styles.preview} />
            ) : (
                <View style={styles.placeholder}>
                    <Text style={{ color: C.muted }}>Sin imagen seleccionada</Text>
                </View>
            )}

            <View style={styles.fila}>
                <TouchableOpacity style={styles.botonSecundario} onPress={elegirDeGaleria}>
                    <Text style={styles.textoSecundario}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonSecundario} onPress={usarCamara}>
                    <Text style={styles.textoSecundario}>Cámara</Text>
                </TouchableOpacity>
            </View>

            <TextInput
                style={styles.input}
                placeholder="Describe tu outfit (máx. 300 caracteres)"
                placeholderTextColor={C.muted}
                value={descripcion}
                onChangeText={(t) => setDescripcion(t.slice(0, 300))}
                multiline
                maxLength={300}
            />
            <Text style={styles.contador}>{descripcion.length}/300</Text>

            <TouchableOpacity
                style={[styles.botonPrincipal, cargando && { opacity: 0.6 }]}
                onPress={publicar}
                disabled={cargando}
            >
                {cargando
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={styles.textoPrincipal}>Publicar</Text>
                }
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, gap: 12, backgroundColor: C.surface, flexGrow: 1 },
    titulo: { fontSize: 20, fontWeight: '700', color: C.ink },
    preview: { width: '100%', height: 280, borderRadius: R.card, backgroundColor: C.earthLight },
    placeholder: { width: '100%', height: 280, borderRadius: R.card, backgroundColor: C.earthLight, justifyContent: 'center', alignItems: 'center' },
    fila: { flexDirection: 'row', gap: 12 },
    botonSecundario: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.btn, paddingVertical: 12, alignItems: 'center' },
    textoSecundario: { color: C.ink, fontWeight: '500' },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: R.input, padding: 12, minHeight: 80, textAlignVertical: 'top', color: C.ink },
    contador: { alignSelf: 'flex-end', color: C.muted, fontSize: 12 },
    botonPrincipal: { backgroundColor: C.earth, borderRadius: R.btn, paddingVertical: 14, alignItems: 'center' },
    textoPrincipal: { color: C.white, fontWeight: '600', fontSize: 16 }, encabezado: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cancelar: {
        fontSize: 15,
        color: C.earth,
        fontWeight: '500',
        width: 60,
    },
});