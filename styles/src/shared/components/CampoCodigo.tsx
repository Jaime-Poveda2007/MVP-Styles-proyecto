// src/shared/components/CampoCodigo.tsx
//
// Campo único para el código de verificación del correo. Un solo
// TextInput (en vez de una casilla por dígito) es más robusto: permite
// pegar el código completo y el autocompletado del teclado.
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { C, R } from '../theme';
import { LONGITUD_OTP, soloDigitos } from '../../lib/authFlow';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export default function CampoCodigo({ value, onChange, onSubmit, autoFocus }: Props) {
  return (
    <TextInput
      style={s.input}
      value={value}
      onChangeText={t => onChange(soloDigitos(t))}
      placeholder={'•'.repeat(LONGITUD_OTP)}
      placeholderTextColor={C.muted}
      keyboardType="number-pad"
      maxLength={LONGITUD_OTP}
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      autoCorrect={false}
      autoFocus={autoFocus}
      returnKeyType="done"
      onSubmitEditing={onSubmit}
      accessibilityLabel={`Código de verificación de ${LONGITUD_OTP} dígitos`}
    />
  );
}

const s = StyleSheet.create({
  input: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    color: C.ink,
    width: '100%',
  },
});
