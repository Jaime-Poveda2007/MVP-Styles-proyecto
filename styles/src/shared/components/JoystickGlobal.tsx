// src/shared/components/JoystickGlobal.tsx
//
// Versión global del joystick que antes vivía solo en PFeed.tsx: se
// monta una sola vez en App.tsx (mismo patrón que AlertaHost), fuera
// de cualquier stack, y usa navigationRef para navegar desde ahí.
// Solo se monta para sesiones de usuario regular — ver el gate en
// App.tsx (estado === 'listo'); las cuentas de marca siguen navegando
// solo con su tab bar propia (Panel/Feed/Perfil).
import React, { useCallback } from 'react';
import { navigationRef } from '../../lib/navigationRef';
import { useNotificaciones } from '../../features/notificaciones/useNotificaciones';
import JoystickMenu, { OpcionJoystick } from './JoystickMenu';

interface Props {
  userId: string;
  rutaActual: string | undefined;
}

export default function JoystickGlobal({ userId, rutaActual }: Props) {
  // esDeMarca siempre false acá: este componente solo se monta para
  // sesiones de usuario regular.
  const { noLeidas } = useNotificaciones(userId, false);

  // rutaActual es undefined en el primer frame (antes de que dispare
  // onReady) — se trata como Feed para no mostrar "Volver" de arranque.
  const enFeed = rutaActual === undefined || rutaActual === 'Feed';

  const handleSeleccionJoystick = useCallback((opcion: OpcionJoystick) => {
    if (!navigationRef.isReady()) return;
    switch (opcion) {
      case 'agregar':
        navigationRef.navigate('CrearPublicacion');
        break;
      case 'buscar':
        navigationRef.navigate('Busqueda', { userId });
        break;
      case 'notificaciones':
        navigationRef.navigate('Notificaciones');
        break;
      case 'perfil':
        navigationRef.navigate('Perfil');
        break;
      case 'volver':
        if (navigationRef.canGoBack()) {
          navigationRef.goBack();
        } else {
          navigationRef.navigate('Home', { screen: 'Feed' });
        }
        break;
    }
  }, [userId]);

  return (
    <JoystickMenu
      onSeleccionar={handleSeleccionJoystick}
      notificacionesNoLeidas={noLeidas}
      enFeed={enFeed}
    />
  );
}
