// src/features/Home/NavHome.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import FeedNavigator from '../feed/NavFeed';
import { supabase } from '../../lib/supabase';
import { C } from '../../shared/theme';

interface Props {
  userId: string;
  onCerrarSesion: () => void;
}

export default function HomeNavigator({ userId, onCerrarSesion }: Props) {
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    onCerrarSesion();
  };

  return (
    <View style={{ flex: 1 }}>
      <FeedNavigator userId={userId} onCerrarSesion={cerrarSesion} />
    </View>
  );
}

const s = StyleSheet.create({
  logoutBtn: {
    position: 'absolute', bottom: 32, right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.white, borderWidth: 0.5,
    borderColor: C.border, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});