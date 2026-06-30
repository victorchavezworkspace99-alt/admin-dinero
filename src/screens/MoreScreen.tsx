import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export function MoreScreen({ navigation }: any) {
  const items = [
    { icon: 'wallet-outline', label: 'Cuentas', screen: 'Accounts', color: '#10B981' },
    { icon: 'grid-outline', label: 'Categorias', screen: 'Categories', color: '#8B5CF6' },
    { icon: 'settings-outline', label: 'Configuracion', screen: 'SettingsMain', color: Colors.textSecondary },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mas Opciones</Text>
      </View>
      <View style={styles.list}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.item}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + '16' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.surface, letterSpacing: -0.5 },
  list: { padding: 16, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  label: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 },
});
