// src/shared/components/AlertaHost.tsx
//
// Renderiza el modal que dispara mostrarAlerta/confirmarAccion
// (src/lib/alerta.ts). Se monta una sola vez en App.tsx, por encima
// de toda la navegación, así que un mismo modal sirve para toda la
// app en vez de reimplementarlo pantalla por pantalla.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { registrarListenerAlerta, EstadoAlerta, BotonAlerta, VarianteBoton } from '../../lib/alerta';
import { useTheme } from '../ThemeContext';

export default function AlertaHost() {
  const { C, R } = useTheme();
  const [estado, setEstado] = useState<EstadoAlerta | null>(null);
  // Los botones se guardan en un ref porque no deben cambiar mientras
  // el modal cierra con la animación — evita que el texto/las acciones
  // "salten" durante el fade-out.
  const pendiente = useRef<EstadoAlerta | null>(null);

  useEffect(() => {
    registrarListenerAlerta((nuevoEstado) => {
      pendiente.current = nuevoEstado;
      setEstado(nuevoEstado);
    });
    return () => registrarListenerAlerta(null);
  }, []);

  const s = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(26,22,20,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: {
      backgroundColor: C.white, borderRadius: R.card, width: '100%', maxWidth: 340,
      paddingTop: 20, paddingBottom: 20, paddingHorizontal: 24, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
    },
    acento: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: C.earth },
    titulo: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3, marginTop: 4 },
    mensaje: { fontSize: 14, color: C.muted, lineHeight: 20, marginTop: 8 },
    botones: { marginTop: 20, gap: 10 },
    botonesFila: { flexDirection: 'row' },
    boton: { borderRadius: R.btn, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
    botonFlex: { flex: 1 },
    botonPrimario: { backgroundColor: C.earth },
    botonSecundario: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
    botonPeligro: { backgroundColor: C.errorLight },
    botonTexto: { fontSize: 14, fontWeight: '700' },
    textoPrimario: { color: C.white },
    textoSecundario: { color: C.ink },
    textoPeligro: { color: C.error },
  }), [C, R]);

  const cerrar = (boton: BotonAlerta) => {
    setEstado(null);
    boton.onPress?.();
  };

  const estiloBoton = (variante: VarianteBoton) => {
    if (variante === 'primario') return s.botonPrimario;
    if (variante === 'peligro') return s.botonPeligro;
    return s.botonSecundario;
  };

  const estiloTextoBoton = (variante: VarianteBoton) => {
    if (variante === 'primario') return s.textoPrimario;
    if (variante === 'peligro') return s.textoPeligro;
    return s.textoSecundario;
  };

  if (!estado) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.acento} />
          <Text style={s.titulo}>{estado.titulo}</Text>
          {estado.mensaje ? <Text style={s.mensaje}>{estado.mensaje}</Text> : null}

          <View style={[s.botones, estado.botones.length > 1 && s.botonesFila]}>
            {estado.botones.map((boton, i) => (
              <TouchableOpacity
                key={i}
                style={[s.boton, estiloBoton(boton.variante), estado.botones.length > 1 && s.botonFlex]}
                onPress={() => cerrar(boton)}
                activeOpacity={0.85}
              >
                <Text style={[s.botonTexto, estiloTextoBoton(boton.variante)]}>{boton.texto}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
