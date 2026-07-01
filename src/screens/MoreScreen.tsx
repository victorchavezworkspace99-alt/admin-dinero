import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export function MoreScreen({ navigation }: any) {
  const { colors: c } = useTheme();
  const items = [
    { icon: 'wallet-outline', label: 'Cuentas', screen: 'Accounts', color: '#10B981' },
    { icon: 'grid-outline', label: 'Categorias', screen: 'Categories', color: '#8B5CF6' },
    { icon: 'repeat-outline', label: 'Transacciones Programadas', screen: 'RecurringTransactions', color: '#F59E0B' },
    { icon: 'settings-outline', label: 'Configuracion', screen: 'SettingsMain', color: c.textSecondary },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ backgroundColor: c.primary, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>Mas Opciones</Text>
      </View>
      <View style={{ padding: 16, gap: 8 }}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 16, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1 }}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={{ width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: item.color + '16' }}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: c.text, letterSpacing: -0.2 }}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textLight} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
