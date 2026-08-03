// src/features/perfil/PEditarPreferencias.tsx
//
// RF-U11: acceso a edición de preferencias de estilo desde el perfil.
// Wrapper delgado: obtiene la selección actual de preferencias_usuario
// y renderiza el mismo wizard de 3 pasos del onboarding, en modo
// 'edicion' (ver props aditivas en OnboardingEstilo.tsx).
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import OnboardingEstilo from '../auth/onboarding/OnboardingEstilo';
import { obtenerPreferencias, Preferencias } from './perfil.api';
import { C } from '../../shared/theme';

interface Props {
  userId: string;
  onListo: () => void;
}

export default function PEditarPreferencias({ userId, onListo }: Props) {
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);

  useEffect(() => {
    obtenerPreferencias(userId)
      .then(setPreferencias)
      .catch(() => setPreferencias({ estilos: [], telas: [], colores: [] }));
  }, [userId]);

  if (!preferencias) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.earth} />
      </View>
    );
  }

  return (
    <OnboardingEstilo
      userId={userId}
      onComplete={onListo}
      preferenciasIniciales={preferencias}
      modo="edicion"
    />
  );
}
