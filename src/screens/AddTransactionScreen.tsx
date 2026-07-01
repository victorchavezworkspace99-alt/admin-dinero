import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getCategories, getAccounts, addTransaction, updateTransaction } from '../database/database';
import { CategorySelector } from '../components/CategorySelector';
import { DatePickerModal } from '../components/DatePickerModal';
import { Category, Account, Transaction, TransactionType } from '../types';

export function AddTransactionScreen({ navigation }: any) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const route = useRoute();
  const editTx = (route.params as any)?.transaction as Transaction | undefined;
  const isEditing = !!editTx;

  const [type, setType] = useState<TransactionType>((editTx?.type as any) || 'expense');
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : '');
  const [description, setDescription] = useState(editTx?.description || '');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedDestAccount, setSelectedDestAccount] = useState<Account | null>(null);
  const [dateStr, setDateStr] = useState(editTx?.date || todayStr);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      if (editTx) {
        const cat = cats.find(cat => cat.id === editTx.category_id);
        if (cat) setSelectedCategory(cat);
      }
    });
    getAccounts().then((accs) => {
      setAccounts(accs);
      if (editTx && editTx.account_id) {
        const acc = accs.find(a => a.id === editTx.account_id);
        if (acc) setSelectedAccount(acc);
      }
      if (editTx && editTx.destination_account_id) {
        const acc = accs.find(a => a.id === editTx.destination_account_id);
        if (acc) setSelectedDestAccount(acc);
      }
    });
  }, [editTx]));

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Monto Invalido', 'Ingresa un monto mayor a cero');
      return;
    }
    if (type !== 'transfer' && !selectedCategory) {
      Alert.alert('Categoria Requerida', 'Selecciona una categoria');
      return;
    }
    if (type === 'transfer' && (!selectedAccount || !selectedDestAccount)) {
      Alert.alert('Cuentas Requeridas', 'Selecciona cuenta origen y destino');
      return;
    }
    if (type === 'transfer' && selectedAccount?.id === selectedDestAccount?.id) {
      Alert.alert('Cuentas Identicas', 'La cuenta origen y destino deben ser diferentes');
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editTx) {
        await updateTransaction(
          editTx.id,
          parseFloat(amount),
          type,
          type === 'transfer' ? null : selectedCategory!.id,
          description,
          dateStr,
          selectedAccount?.id,
          type === 'transfer' ? selectedDestAccount?.id : undefined
        );
      } else {
        await addTransaction(
          parseFloat(amount),
          type,
          type === 'transfer' ? null : selectedCategory!.id,
          description,
          dateStr,
          selectedAccount?.id,
          type === 'transfer' ? selectedDestAccount?.id : undefined
        );
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la transaccion');
    }
    setSaving(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 16 + insets.top }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 }}>{isEditing ? 'Editar' : 'Nueva'} Transaccion</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={{ padding: 4 }}>
          <Text style={[{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }, saving && { opacity: 0.5 }]}>
            {saving ? 'Guardando' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 20, backgroundColor: c.surface, borderRadius: 14, padding: 4, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center', backgroundColor: type === 'expense' ? c.expense : 'transparent' }}
          onPress={() => { setType('expense'); setSelectedCategory(null); }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: type === 'expense' ? '#FFFFFF' : c.textSecondary }}>Gasto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center', backgroundColor: type === 'income' ? c.income : 'transparent' }}
          onPress={() => { setType('income'); setSelectedCategory(null); }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: type === 'income' ? '#FFFFFF' : c.textSecondary }}>Ingreso</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center', backgroundColor: type === 'transfer' ? c.primary : 'transparent' }}
          onPress={() => { setType('transfer'); setSelectedCategory(null); }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: type === 'transfer' ? '#FFFFFF' : c.textSecondary }}>Transferencia</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28, marginBottom: 16 }}>
        <Text style={{ fontSize: 32, color: c.textSecondary, fontWeight: '300', marginRight: 4 }}>$</Text>
        <TextInput
          style={{ fontSize: 48, fontWeight: '800', color: c.text, textAlign: 'center', minWidth: 200, letterSpacing: -1 }}
          placeholder="0.00"
          placeholderTextColor={c.textLight}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />
      </View>

      <TextInput
        style={{ backgroundColor: c.surface, marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: c.text, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }}
        placeholder="Descripcion (opcional)"
        placeholderTextColor={c.textLight}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, marginHorizontal: 20, marginTop: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2, gap: 10 }} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
        </View>
        <Text style={{ flex: 1, fontSize: 15, color: c.text, fontWeight: '500' }}>{dateStr}</Text>
        <Ionicons name="chevron-down" size={18} color={c.textLight} />
      </TouchableOpacity>

      <DatePickerModal
        visible={showPicker}
        dateStr={dateStr}
        onSelect={setDateStr}
        onClose={() => setShowPicker(false)}
      />

      {type !== 'transfer' ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginHorizontal: 20, marginTop: 24, marginBottom: 12, letterSpacing: -0.3 }}>Cuenta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingLeft: 20, marginBottom: 4 }}>
            {accounts.map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={[{ alignItems: 'center', marginRight: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: c.border }, selectedAccount?.id === acc.id && { borderColor: acc.color, backgroundColor: acc.color + '12' }]}
                onPress={() => setSelectedAccount(selectedAccount?.id === acc.id ? null : acc)}
                activeOpacity={0.7}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6, backgroundColor: acc.color + '18' }}>
                  <Ionicons name={acc.icon as any} size={20} color={acc.color} />
                </View>
                <Text style={[{ fontSize: 12, fontWeight: '600', color: c.textSecondary, textAlign: 'center' }, selectedAccount?.id === acc.id && { color: acc.color, fontWeight: '700' }]}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginHorizontal: 20, marginTop: 24, marginBottom: 12, letterSpacing: -0.3 }}>Cuenta Origen</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingLeft: 20, marginBottom: 4 }}>
            {accounts.filter(a => a.id !== selectedDestAccount?.id).map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={[{ alignItems: 'center', marginRight: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: c.border }, selectedAccount?.id === acc.id && { borderColor: acc.color, backgroundColor: acc.color + '12' }]}
                onPress={() => setSelectedAccount(selectedAccount?.id === acc.id ? null : acc)}
                activeOpacity={0.7}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6, backgroundColor: acc.color + '18' }}>
                  <Ionicons name={acc.icon as any} size={20} color={acc.color} />
                </View>
                <Text style={[{ fontSize: 12, fontWeight: '600', color: c.textSecondary, textAlign: 'center' }, selectedAccount?.id === acc.id && { color: acc.color, fontWeight: '700' }]}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginHorizontal: 20, marginTop: 18, marginBottom: 12, letterSpacing: -0.3 }}>Cuenta Destino</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingLeft: 20, marginBottom: 4 }}>
            {accounts.filter(a => a.id !== selectedAccount?.id).map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={[{ alignItems: 'center', marginRight: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: c.border }, selectedDestAccount?.id === acc.id && { borderColor: acc.color, backgroundColor: acc.color + '12' }]}
                onPress={() => setSelectedDestAccount(selectedDestAccount?.id === acc.id ? null : acc)}
                activeOpacity={0.7}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6, backgroundColor: acc.color + '18' }}>
                  <Ionicons name={acc.icon as any} size={20} color={acc.color} />
                </View>
                <Text style={[{ fontSize: 12, fontWeight: '600', color: c.textSecondary, textAlign: 'center' }, selectedDestAccount?.id === acc.id && { color: acc.color, fontWeight: '700' }]}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {type !== 'transfer' && (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginHorizontal: 20, marginTop: 24, marginBottom: 12, letterSpacing: -0.3 }}>Categoria</Text>
          <CategorySelector
            categories={categories}
            selectedId={selectedCategory?.id ?? null}
            onSelect={setSelectedCategory}
            type={type}
          />
        </>
      )}

      <View style={{ height: 100 + insets.bottom }} />
    </ScrollView>
  );
}
