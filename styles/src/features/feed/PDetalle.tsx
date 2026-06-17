// src/features/feed/PDetalle.tsx
import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, Repeat2, ExternalLink, Tag } from 'lucide-react-native';
import { Publicacion, Etiqueta } from './types';
import { supabase } from '../../lib/supabase';
import { C } from '../../shared/theme';

const { width } = Dimensions.get('window');

interface Props {
  publicacion: Publicacion;
  userId: string;
  onVolver: () => void;
}

export default function PDetalle({ publicacion: pub, userId, onVolver }: Props) {
  const [likes,    setLikes]    = useState(pub.likes_count);
  const [yoLike,   setYoLike]   = useState(pub.yo_di_like);
  const [toggling, setToggling] = useState(false);
  const [etqSel,   setEtqSel]   = useState<Etiqueta | null>(null);

  const toggleLike = async () => {
    if (toggling) return;
    setToggling(true);
    const nuevo = !yoLike;
    setYoLike(nuevo);
    setLikes(p => p + (nuevo ? 1 : -1));
    nuevo
      ? await supabase.from('likes').insert({ usuario_id: userId, publicacion_id: pub.id })
      : await supabase.from('likes').delete().eq('usuario_id', userId).eq('publicacion_id', pub.id);
    setToggling(false);
  };

  const abrirTienda = (url?: string | null) => {
    if (!url) { Alert.alert('Sin enlace', 'Esta prenda no tiene enlace de tienda.'); return; }
    Linking.openURL(url);
  };

  const nombre  = pub.es_de_marca ? pub.marca?.nombre   : pub.usuario?.username;
  const fotoUrl = pub.es_de_marca ? pub.marca?.logo_url : pub.usuario?.foto_url;

  return (
    <SafeAreaView style={d.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={d.header}>
          <TouchableOpacity style={d.backBtn} onPress={onVolver}>
            <ChevronLeft size={24} color={C.ink} strokeWidth={2} />
          </TouchableOpacity>
          {pub.es_de_marca && <View style={d.badge}><Text style={d.badgeText}>Marca</Text></View>}
        </View>

        {/* Imagen con etiquetas */}
        <View style={d.imagenWrap}>
          <Image source={{ uri: pub.imagen_url }} style={d.imagen} resizeMode="cover" />
          {/*
            pos_x y pos_y se guardan en Supabase como fracción 0–1
            (igual que en la pantalla de creación, EtiquetadoImagen.tsx).
            Se multiplican por 100 aquí porque "left"/"top" en CSS/RN
            esperan un porcentaje (0–100), no la fracción cruda.
          */}
          {pub.etiquetas.map(etq => (
            <TouchableOpacity
              key={etq.id}
              style={[d.etqPunto, { left: `${etq.pos_x * 100}%`, top: `${etq.pos_y * 100}%` }, etqSel?.id === etq.id && d.etqPuntoActivo]}
              onPress={() => setEtqSel(prev => prev?.id === etq.id ? null : etq)}
            >
              <Tag size={10} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          ))}
          {etqSel && (
            <View style={[d.popup, {
              left:  etqSel.pos_x * 100 <= 60 ? `${Math.min(etqSel.pos_x * 100, 55)}%` : undefined,
              right: etqSel.pos_x * 100 >  60 ? '8%' : undefined,
              top:   `${Math.min(etqSel.pos_y * 100 + 5, 70)}%`,
            }]}>
              <Text style={d.popupNombre}>{etqSel.es_manual ? etqSel.nombre_manual : etqSel.prenda?.nombre}</Text>
              <Text style={d.popupMarca}>{etqSel.es_manual ? etqSel.marca_manual : etqSel.prenda?.marca?.nombre}</Text>
              {(etqSel.es_manual ? etqSel.precio_manual : etqSel.prenda?.precio) != null && (
                <Text style={d.popupPrecio}>${(etqSel.es_manual ? etqSel.precio_manual : etqSel.prenda?.precio)?.toLocaleString('es-CO')}</Text>
              )}
              {!etqSel.es_manual && etqSel.prenda?.url_tienda && (
                <TouchableOpacity style={d.popupBtn} onPress={() => abrirTienda(etqSel.prenda?.url_tienda)}>
                  <ExternalLink size={10} color="#fff" strokeWidth={2.5} />
                  <Text style={d.popupBtnText}>Ver en tienda</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Autor */}
        <View style={d.autorWrap}>
          {fotoUrl
            ? <Image source={{ uri: fotoUrl }} style={d.avatar} />
            : <View style={d.avatarPH}><Text style={d.avatarLetra}>{(nombre ?? '?')[0].toUpperCase()}</Text></View>
          }
          <View style={{ flex: 1 }}>
            <Text style={d.autorNombre}>{nombre ?? '—'}</Text>
            {!pub.es_de_marca && pub.usuario?.nombre && <Text style={d.autorSub}>{pub.usuario.nombre}</Text>}
          </View>
        </View>

        {pub.descripcion && <View style={d.seccion}><Text style={d.descripcion}>{pub.descripcion}</Text></View>}

        {/* Acciones */}
        <View style={d.accionesWrap}>
          <TouchableOpacity style={d.accionBtn} onPress={toggleLike}>
            <Heart size={22} color={yoLike ? C.earth : C.muted} fill={yoLike ? C.earth : 'none'} strokeWidth={2} />
            <Text style={[d.accionCount, yoLike && { color: C.earth }]}>{likes} {likes === 1 ? 'like' : 'likes'}</Text>
          </TouchableOpacity>
          <View style={d.accionBtn}>
            <Repeat2 size={22} color={C.muted} strokeWidth={2} />
            <Text style={d.accionCount}>{pub.reposts_count} {pub.reposts_count === 1 ? 'repost' : 'reposts'}</Text>
          </View>
        </View>

        {/* Prendas etiquetadas */}
        {pub.etiquetas.length > 0 && (
          <View style={d.seccion}>
            <Text style={d.seccionTitulo}>Prendas en este look</Text>
            {pub.etiquetas.map(etq => {
              const nom    = etq.es_manual ? etq.nombre_manual : etq.prenda?.nombre;
              const marca  = etq.es_manual ? etq.marca_manual  : etq.prenda?.marca?.nombre;
              const precio = etq.es_manual ? etq.precio_manual : etq.prenda?.precio;
              return (
                <View key={etq.id} style={d.prendaRow}>
                  <View style={d.prendaIcono}><Tag size={14} color={C.earth} strokeWidth={2} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={d.prendaNombre} numberOfLines={1}>{nom}</Text>
                    {marca && <Text style={d.prendaMarca}>{marca}</Text>}
                  </View>
                  <View style={d.prendaDerecha}>
                    {precio != null && <Text style={d.prendaPrecio}>${precio.toLocaleString('es-CO')}</Text>}
                    {!etq.es_manual && etq.prenda?.url_tienda && (
                      <TouchableOpacity style={d.verBtn} onPress={() => abrirTienda(etq.prenda?.url_tienda)}>
                        <ExternalLink size={12} color={C.earth} strokeWidth={2} />
                        <Text style={d.verBtnText}>Ver</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.white },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.border },
  badge:         { backgroundColor: C.earth, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
  imagenWrap:    { width, height: width * 1.2, position: 'relative' },
  imagen:        { width: '100%', height: '100%' },
  etqPunto:      { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: C.earth, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -14 }, { translateY: -14 }], elevation: 4 },
  etqPuntoActivo:{ backgroundColor: C.earthDark },
  popup:         { position: 'absolute', backgroundColor: 'rgba(26,22,20,0.92)', borderRadius: 12, padding: 12, minWidth: 140, maxWidth: 180, gap: 3, elevation: 8 },
  popupNombre:   { fontSize: 13, fontWeight: '700', color: '#fff' },
  popupMarca:    { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  popupPrecio:   { fontSize: 13, fontWeight: '600', color: C.earthLight, marginTop: 2 },
  popupBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.earth, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, marginTop: 6, alignSelf: 'flex-start' },
  popupBtnText:  { fontSize: 11, color: '#fff', fontWeight: '600' },
  autorWrap:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  avatar:        { width: 40, height: 40, borderRadius: 20 },
  avatarPH:      { width: 40, height: 40, borderRadius: 20, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  avatarLetra:   { fontSize: 16, fontWeight: '700', color: C.earth },
  autorNombre:   { fontSize: 15, fontWeight: '700', color: C.ink },
  autorSub:      { fontSize: 13, color: C.muted },
  seccion:       { paddingHorizontal: 16, paddingBottom: 20 },
  descripcion:   { fontSize: 15, color: C.ink, lineHeight: 22 },
  accionesWrap:  { flexDirection: 'row', gap: 24, paddingHorizontal: 16, paddingBottom: 20, borderBottomWidth: 0.5, borderBottomColor: C.border, marginBottom: 20 },
  accionBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accionCount:   { fontSize: 15, color: C.muted, fontWeight: '500' },
  seccionTitulo: { fontSize: 13, fontWeight: '600', color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  prendaRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  prendaIcono:   { width: 36, height: 36, borderRadius: 10, backgroundColor: C.earthLight, alignItems: 'center', justifyContent: 'center' },
  prendaNombre:  { fontSize: 14, fontWeight: '600', color: C.ink },
  prendaMarca:   { fontSize: 12, color: C.muted, marginTop: 2 },
  prendaDerecha: { alignItems: 'flex-end', gap: 4 },
  prendaPrecio:  { fontSize: 14, fontWeight: '700', color: C.ink },
  verBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.earth, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  verBtnText:    { fontSize: 11, color: C.earth, fontWeight: '600' },
});
