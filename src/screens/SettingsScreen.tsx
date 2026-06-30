import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export function SettingsScreen() {
  const handleReset = () => {
    Alert.alert('Reiniciar Datos', 'Se eliminaran todas las transacciones y presupuestos. Esta accion no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reiniciar', style: 'destructive', onPress: async () => {
        try {
          const { openDatabase } = await import('../database/database');
          const db = await openDatabase();
          await db.execAsync('DELETE FROM transactions; DELETE FROM budgets;');
          Alert.alert('Listo', 'Datos reiniciados');
        } catch { }
      }},
    ]);
  };

  const settingItems = [
    { icon: 'server-outline', label: 'Base de datos', value: 'SQLite local en el dispositivo', color: '#0FA870' },
    { icon: 'phone-portrait-outline', label: 'Version', value: '1.0.0', color: Colors.primary },
    { icon: 'trash-outline', label: 'Reiniciar datos', value: '', color: Colors.expense, action: handleReset },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuracion</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informacion</Text>
        {settingItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.settingItem}
            onPress={item.action}
            disabled={!item.action}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: item.color + '16' }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{item.label}</Text>
              {item.value ? <Text style={styles.settingValue}>{item.value}</Text> : null}
            </View>
            {item.action && <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de</Text>
        <View style={styles.aboutCard}>
          <View style={styles.aboutIcon}>
            <Ionicons name="wallet" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>Admin Dinero</Text>
          <Text style={styles.appDesc}>Tu administrador financiero personal</Text>
          <Text style={styles.appDesc}>Datos almacenados localmente en el dispositivo.</Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
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
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8, marginLeft: 4, letterSpacing: -0.3 },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 6,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 },
  settingValue: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  aboutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  aboutIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 14, letterSpacing: -0.5 },
  appDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', lineHeight: 18 },
});
