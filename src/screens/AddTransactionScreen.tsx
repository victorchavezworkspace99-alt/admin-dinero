import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getCategories, getAccounts, addTransaction, updateTransaction, getTransactions } from '../database/database';
import { CategorySelector } from '../components/CategorySelector';
import { DatePickerModal } from '../components/DatePickerModal';
import { Category, Account, Transaction } from '../types';

export function AddTransactionScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const editTx = (route.params as any)?.transaction as Transaction | undefined;
  const isEditing = !!editTx;

  const parseDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [type, setType] = useState<'income' | 'expense'>((editTx?.type as any) || 'expense');
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : '');
  const [description, setDescription] = useState(editTx?.description || '');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [date, setDate] = useState(editTx ? parseDate(editTx.date) : new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      if (editTx) {
        const cat = cats.find(c => c.id === editTx.category_id);
        if (cat) setSelectedCategory(cat);
      }
    });
    getAccounts().then((accs) => {
      setAccounts(accs);
      if (editTx && editTx.account_id) {
        const acc = accs.find(a => a.id === editTx.account_id);
        if (acc) setSelectedAccount(acc);
      }
    });
  }, []));

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSelectDate = (d: Date) => setDate(d);

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
      if (isEditing && editTx) {
        await updateTransaction(editTx.id, parseFloat(amount), type, selectedCategory.id, description, formatDate(date), selectedAccount?.id);
      } else {
        await addTransaction(parseFloat(amount), type, selectedCategory.id, description, formatDate(date), selectedAccount?.id);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la transaccion');
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={26} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Editar' : 'Nueva'} Transaccion</Text>
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

      <TouchableOpacity style={styles.dateRow} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
        <View style={styles.dateIconBox}>
          <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
        </View>
        <Text style={styles.dateText}>{formatDate(date)}</Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textLight} />
      </TouchableOpacity>

      <DatePickerModal
        visible={showPicker}
        date={date}
        onSelect={handleSelectDate}
        onClose={() => setShowPicker(false)}
      />

      <Text style={styles.sectionLabel}>Cuenta</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
        {accounts.filter(a => {
          const bal = a.id;
          return true;
        }).map(acc => (
          <TouchableOpacity
            key={acc.id}
            style={[
              styles.accountItem,
              selectedAccount?.id === acc.id && { borderColor: acc.color, backgroundColor: acc.color + '12' },
            ]}
            onPress={() => setSelectedAccount(selectedAccount?.id === acc.id ? null : acc)}
            activeOpacity={0.7}
          >
            <View style={[styles.accountIcon, { backgroundColor: acc.color + '18' }]}>
              <Ionicons name={acc.icon as any} size={20} color={acc.color} />
            </View>
            <Text style={[styles.accountName, selectedAccount?.id === acc.id && { color: acc.color, fontWeight: '700' }]}>
              {acc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>Categoria</Text>
      <CategorySelector
        categories={categories}
        selectedId={selectedCategory?.id ?? null}
        onSelect={setSelectedCategory}
        type={type}
      />

      <View style={{ height: 100 + insets.bottom }} />
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
  dateText: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  accountScroll: { flexGrow: 0, paddingLeft: 20, marginBottom: 4 },
  accountItem: {
    alignItems: 'center', marginRight: 10, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
  },
  accountIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  accountName: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
});
