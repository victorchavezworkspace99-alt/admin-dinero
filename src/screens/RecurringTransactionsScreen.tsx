import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { CategoryColors } from '../theme/colors';
import {
  getCategories,
  getAccounts,
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction
} from '../database/database';
import { CategorySelector } from '../components/CategorySelector';
import { DatePickerModal } from '../components/DatePickerModal';
import { Category, Account, RecurringTransaction, TransactionType } from '../types';
import { CURRENCIES, formatCurrency as fsFormatCurrency } from '../store/SettingsStore';

const FREQUENCIES = [
  { key: 'daily' as const, label: 'Diario' },
  { key: 'weekly' as const, label: 'Semanal' },
  { key: 'monthly' as const, label: 'Mensual' },
  { key: 'yearly' as const, label: 'Anual' }
];

export function RecurringTransactionsScreen({ navigation }: any) {
  const { colors: c, formatCurrency } = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [recurringTxs, setRecurringTxs] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);

  // Form states
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedDestAccount, setSelectedDestAccount] = useState<Account | null>(null);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = useCallback(async () => {
    const recs = await getRecurringTransactions();
    setRecurringTxs(recs);
    const cats = await getCategories();
    setCategories(cats);
    const accs = await getAccounts();
    setAccounts(accs);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openAdd = () => {
    setEditItem(null);
    setType('expense');
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setSelectedAccount(accounts[0] || null);
    setSelectedDestAccount(null);
    setFrequency('monthly');
    setStartDate(todayStr);
    setModalVisible(true);
  };

  const openEdit = (item: RecurringTransaction) => {
    setEditItem(item);
    setType(item.type);
    setAmount(String(item.amount));
    setDescription(item.description || '');
    
    const cat = categories.find(c => c.id === item.category_id);
    setSelectedCategory(cat || null);
    
    const sAcc = accounts.find(a => a.id === item.source_account_id);
    setSelectedAccount(sAcc || null);
    
    const dAcc = accounts.find(a => a.id === item.destination_account_id);
    setSelectedDestAccount(dAcc || null);
    
    setFrequency(item.frequency);
    setStartDate(item.start_date);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Monto Invalido', 'Ingresa un monto mayor a cero');
      return;
    }
    if (type !== 'transfer' && !selectedCategory) {
      Alert.alert('Categoria Requerida', 'Selecciona una categoria');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('Cuenta Requerida', 'Selecciona una cuenta origen');
      return;
    }
    if (type === 'transfer' && !selectedDestAccount) {
      Alert.alert('Cuenta Destino Requerida', 'Selecciona una cuenta destino');
      return;
    }
    if (type === 'transfer' && selectedAccount.id === selectedDestAccount?.id) {
      Alert.alert('Cuentas Identicas', 'La cuenta origen y destino deben ser diferentes');
      return;
    }

    try {
      if (editItem) {
        await updateRecurringTransaction(
          editItem.id,
          parseFloat(amount),
          type,
          type === 'transfer' ? null : selectedCategory!.id,
          selectedAccount.id,
          type === 'transfer' ? selectedDestAccount!.id : null,
          description.trim(),
          frequency,
          startDate,
          editItem.next_date,
          editItem.is_active
        );
      } else {
        await addRecurringTransaction(
          parseFloat(amount),
          type,
          type === 'transfer' ? null : selectedCategory!.id,
          selectedAccount.id,
          type === 'transfer' ? selectedDestAccount!.id : null,
          description.trim(),
          frequency,
          startDate
        );
      }
      setModalVisible(false);
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la transaccion programada');
    }
  };

  const handleDelete = (item: RecurringTransaction) => {
    Alert.alert('Eliminar Transaccion Programada', '¿Seguro que deseas eliminar esta programacion permanente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await deleteRecurringTransaction(item.id);
        loadData();
      }}
    ]);
  };

  const toggleActive = async (item: RecurringTransaction) => {
    try {
      await updateRecurringTransaction(
        item.id,
        item.amount,
        item.type,
        item.category_id,
        item.source_account_id,
        item.destination_account_id ?? null,
        item.description || '',
        item.frequency,
        item.start_date,
        item.next_date,
        item.is_active === 1 ? 0 : 1
      );
      loadData();
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  };

  const getFreqLabel = (freq: string) => FREQUENCIES.find(f => f.key === freq)?.label || freq;

  const getAccountCurrency = (accId: number) => {
    const acc = accounts.find(a => a.id === accId);
    return acc ? acc.currency_code : 'PEN';
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 }}>Transacciones Programadas</Text>
        <TouchableOpacity onPress={openAdd} style={{ padding: 4 }}>
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={recurringTxs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          const isTransfer = item.type === 'transfer';
          const amountColor = isTransfer ? c.text : (isIncome ? c.income : c.expense);
          const iconName = isTransfer ? 'swap-horizontal' : (item.type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle');
          const sourceAccCode = getAccountCurrency(item.source_account_id);
          const currencyObj = CURRENCIES.find(cur => cur.code === sourceAccCode) || CURRENCIES.find(cur => cur.code === 'PEN')!;

          return (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2, opacity: item.is_active === 1 ? 1 : 0.6 }}
              onPress={() => openEdit(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: amountColor + '18' }}>
                <Ionicons name={iconName as any} size={22} color={amountColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, letterSpacing: -0.2 }}>
                  {isTransfer ? 'Transferencia' : (item.category_name || 'Sin categoria')}
                </Text>
                <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }} numberOfLines={1}>
                  {item.description || (isTransfer ? `De ${item.source_account_name} a ${item.destination_account_name}` : `Cuenta: ${item.source_account_name}`)}
                </Text>
                <Text style={{ fontSize: 11, color: c.textLight, marginTop: 4 }}>
                  {getFreqLabel(item.frequency)} • Próximo: {item.next_date}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: amountColor, letterSpacing: -0.3 }}>
                  {fsFormatCurrency(item.amount, currencyObj)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggleActive(item)} style={{ padding: 4 }}>
                <Ionicons
                  name={item.is_active === 1 ? 'toggle' : 'toggle-outline'}
                  size={32}
                  color={item.is_active === 1 ? c.primary : c.textLight}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 100 }}>
            <Ionicons name="repeat-outline" size={64} color={c.textLight} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.textSecondary, marginTop: 16 }}>Sin transacciones programadas</Text>
            <Text style={{ fontSize: 13, color: c.textLight, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
              Agrega transacciones fijas (como sueldo, alquiler, suscripciones) para que se inserten automáticamente.
            </Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 16, letterSpacing: -0.3 }}>
                {editItem ? 'Editar' : 'Nueva'} Transaccion Programada
              </Text>

              {/* Type selector */}
              <View style={{ flexDirection: 'row', backgroundColor: c.background, borderRadius: 12, padding: 4, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: type === 'expense' ? c.expense : 'transparent' }}
                  onPress={() => { setType('expense'); setSelectedCategory(null); }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: type === 'expense' ? '#FFFFFF' : c.textSecondary }}>Gasto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: type === 'income' ? c.income : 'transparent' }}
                  onPress={() => { setType('income'); setSelectedCategory(null); }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: type === 'income' ? '#FFFFFF' : c.textSecondary }}>Ingreso</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: type === 'transfer' ? c.primary : 'transparent' }}
                  onPress={() => { setType('transfer'); setSelectedCategory(null); }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: type === 'transfer' ? '#FFFFFF' : c.textSecondary }}>Transf.</Text>
                </TouchableOpacity>
              </View>

              {/* Amount and Description */}
              <TextInput
                style={{ backgroundColor: c.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: c.text, marginBottom: 10 }}
                placeholder="Monto"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholderTextColor={c.textLight}
              />
              <TextInput
                style={{ backgroundColor: c.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: c.text, marginBottom: 16 }}
                placeholder="Descripcion (opcional)"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={c.textLight}
              />

              {/* Frequency Selector */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 10 }}>Frecuencia</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                {FREQUENCIES.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: frequency === f.key ? c.primary : c.border, backgroundColor: frequency === f.key ? c.primary + '12' : c.background, alignItems: 'center' }}
                    onPress={() => setFrequency(f.key)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: frequency === f.key ? c.primary : c.textSecondary }}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Start Date */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 8 }}>Fecha de Inicio</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, gap: 10 }}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
                <Text style={{ flex: 1, fontSize: 15, color: c.text }}>{startDate}</Text>
                <Ionicons name="chevron-down" size={16} color={c.textLight} />
              </TouchableOpacity>

              {/* Accounts Selection */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 8 }}>
                {type === 'transfer' ? 'Cuenta Origen' : 'Cuenta'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {accounts.filter(a => a.id !== selectedDestAccount?.id).map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[{ alignItems: 'center', marginRight: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: c.border }, selectedAccount?.id === acc.id && { borderColor: acc.color, backgroundColor: acc.color + '12' }]}
                    onPress={() => setSelectedAccount(acc)}
                  >
                    <Ionicons name={acc.icon as any} size={18} color={acc.color} style={{ marginBottom: 4 }} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary }}>{acc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {type === 'transfer' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 8 }}>Cuenta Destino</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {accounts.filter(a => a.id !== selectedAccount?.id).map(acc => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[{ alignItems: 'center', marginRight: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: c.border }, selectedDestAccount?.id === acc.id && { borderColor: acc.color, backgroundColor: acc.color + '12' }]}
                        onPress={() => setSelectedDestAccount(acc)}
                      >
                        <Ionicons name={acc.icon as any} size={18} color={acc.color} style={{ marginBottom: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary }}>{acc.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Category selector */}
              {type !== 'transfer' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 10 }}>Categoria</Text>
                  <CategorySelector
                    categories={categories}
                    selectedId={selectedCategory?.id ?? null}
                    onSelect={setSelectedCategory}
                    type={type}
                  />
                  <View style={{ height: 16 }} />
                </>
              )}

              {/* Modal Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: c.background, alignItems: 'center' }}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: c.textSecondary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' }}
                  onPress={handleSave}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        dateStr={startDate}
        onSelect={setStartDate}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
}
