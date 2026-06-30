import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface Estilo {
  id: string;
  nombre: string;
}

export function useEstilos() {
  const [estilos, setEstilos] = useState<Estilo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('estilos')
      .select('id, nombre')
      .eq('activo', true)
      .order('orden')
      .then(({ data, error }) => {
        if (!error && data) setEstilos(data);
        setLoading(false);
      });
  }, []);

  return { estilos, loading };
}
