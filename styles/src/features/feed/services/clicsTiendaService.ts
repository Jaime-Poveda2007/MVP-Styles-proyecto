// src/features/feed/services/clicsTiendaService.ts
//
// RF-M05: registra cada clic en "Ver en tienda" para que la marca
// dueña de la prenda pueda verlo en su panel de métricas. Es
// fire-and-forget desde PDetalle.tsx — nunca debe bloquear ni fallar
// visiblemente para quien está comprando, solo para quien mide.
import { supabase } from '../../../lib/supabase';

export async function registrarClicTienda(prendaId: string, usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from('clics_tienda')
    .insert({ prenda_id: prendaId, usuario_id: usuarioId });
  if (error) throw error;
}
