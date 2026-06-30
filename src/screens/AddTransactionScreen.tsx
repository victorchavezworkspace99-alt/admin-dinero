import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getCategories, addTransaction } from '../database/database';
import { CategorySelector } from '../components/CategorySelector';
import { Category } from '../types';

export function AddTransactionScreen({ navigation }: any) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    getCategories().then(setCategories);
  }, []));

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Monto Invalido', 'Ingresa un monto mayor a cero');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Categoria Requerida', 'Selecciona una categoria');
      return;
    }
    setSaving(true);
    try {
      await addTransaction(parseFloat(amount), type, selectedCategory.id, description, date);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la transaccion');
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={26} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.title}>Nueva Transaccion</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerBtn}>
          <Text style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
            {saving ? 'Guardando' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
          onPress={() => { setType('expense'); setSelectedCategory(null); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Gasto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
          onPress={() => { setType('income'); setSelectedCategory(null); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Ingreso</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.currencySign}>$</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor={Colors.textLight}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />
      </View>

      <TextInput
        style={styles.descInput}
        placeholder="Descripcion (opcional)"
        placeholderTextColor={Colors.textLight}
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.dateRow}>
        <View style={styles.dateIconBox}>
          <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
        </View>
        <TextInput
          style={styles.dateInput}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <Text style={styles.sectionLabel}>Categoria</Text>
      <CategorySelector
        categories={categories}
        selectedId={selectedCategory?.id ?? null}
        onSelect={setSelectedCategory}
        type={type}
      />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  headerBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.surface, letterSpacing: -0.3 },
  saveBtn: { fontSize: 16, fontWeight: '700', color: Colors.surface },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
  },
  typeBtnExpense: { backgroundColor: Colors.expense },
  typeBtnIncome: { backgroundColor: Colors.income },
  typeText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  typeTextActive: { color: Colors.surface },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  currencySign: { fontSize: 32, color: Colors.textSecondary, fontWeight: '300', marginRight: 4 },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    minWidth: 200,
    letterSpacing: -1,
  },
  descInput: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  dateIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInput: { flex: 1, fontSize: 15, color: Colors.text },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
});
