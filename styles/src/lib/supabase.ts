// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://ilheakbvzqejvgqkyynu.supabase.co';   // ← reemplaza
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaGVha2J2enFlanZncWt5eW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzA5ODcsImV4cCI6MjA5MTYwNjk4N30.bKRQIZ2yqNHxjUB2afwYnHxcRRcjoCEiEipORmpD8oM';                  // ← reemplaza

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,       // persiste la sesión en el dispositivo
    autoRefreshToken: true,      // renueva el token automáticamente
    persistSession: true,        // la sesión sobrevive a cerrar la app
    detectSessionInUrl: false,   // no aplica en React Native
  },
});