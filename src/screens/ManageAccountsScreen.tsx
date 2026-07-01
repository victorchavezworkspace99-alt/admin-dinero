import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { CategoryColors } from '../theme/colors';
import { getAccounts, addAccount, updateAccount, deleteAccount, getAccountBalance } from '../database/database';
import { Account, AccountType } from '../types';

const ACCOUNT_ICONS = ['cash-outline', 'business-outline', 'phone-portrait-outline', 'wallet-outline', 'card-outline', 'save-outline', 'trending-up-outline', 'globe-outline'];
const ACCOUNT_TYPES: { key: AccountType; label: string; icon: string }[] = [
  { key: 'cash', label: 'Efectivo', icon: 'cash-outline' },
  { key: 'bank', label: 'Banco', icon: 'business-outline' },
  { key: 'digital', label: 'Billetera Digital', icon: 'phone-portrait-outline' },
];

export function ManageAccountsScreen({ navigation }: any) {
  const { colors: c, formatCurrency } = useTheme();
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ACCOUNT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(CategoryColors[0]);

  const load = useCallback(async () => {
    const accs = await getAccounts();
    setAccounts(accs);
    const b: Record<number, number> = {};
    for (const a of accs) {
      b[a.id] = await getAccountBalance(a.id);
    }
    setBalances(b);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditItem(null);
    setName('');
    setAccType('bank');
    setBankName('');
    setAccountNumber('');
    setSelectedIcon(ACCOUNT_ICONS[0]);
    setSelectedColor(CategoryColors[0]);
    setModalVisible(true);
  };

  const openEdit = (item: Account) => {
    setEditItem(item);
    setName(item.name);
    setAccType(item.type);
    setBankName(item.bank_name || '');
    setAccountNumber(item.account_number || '');
    setSelectedIcon(item.icon || ACCOUNT_ICONS[0]);
    setSelectedColor(item.color || CategoryColors[0]);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Requerido', 'Ingresa un nombre'); return; }
    try {
      if (editItem) {
        await updateAccount(editItem.id, name.trim(), accType, bankName.trim(), accountNumber.trim(), selectedIcon, selectedColor);
      } else {
        await addAccount(name.trim(), accType, bankName.trim(), accountNumber.trim(), selectedIcon, selectedColor);
      }
      setModalVisible(false);
      load();
    } catch { Alert.alert('Error', 'No se pudo guardar'); }
  };

  const handleDelete = (item: Account) => {
    Alert.alert('Eliminar cuenta', `¿Eliminar "${item.name}" permanentemente?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await deleteAccount(item.id);
          load();
        } catch (e: any) {
          Alert.alert('Error', e?.message || 'No se pudo eliminar la cuenta');
        }
      }},
    ]);
  };

  const typeLabel = (t: AccountType) => ACCOUNT_TYPES.find(a => a.key === t)?.label || t;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 }}>Cuentas</Text>
        <TouchableOpacity onPress={openAdd} style={{ padding: 4 }}>
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 8, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }} onPress={() => openEdit(item)} onLongPress={() => !item.is_default && handleDelete(item)} activeOpacity={0.7}>
            <View style={{ width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14, backgroundColor: item.color + '18' }}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, letterSpacing: -0.2 }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>{typeLabel(item.type)}{item.bank_name ? ` - ${item.bank_name}` : ''}</Text>
              {item.account_number ? <Text style={{ fontSize: 11, color: c.textLight, marginTop: 1 }}>Nro: {item.account_number}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[{ fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }, { color: (balances[item.id] ?? 0) >= 0 ? c.text : c.expense }]}>
                {formatCurrency(balances[item.id] ?? 0)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 20, letterSpacing: -0.3 }}>{editItem ? 'Editar' : 'Nueva'} Cuenta</Text>

            <TextInput style={{ backgroundColor: c.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: c.text, marginBottom: 10 }} placeholder="Nombre" value={name} onChangeText={setName} placeholderTextColor={c.textLight} />
            <TextInput style={{ backgroundColor: c.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: c.text, marginBottom: 10 }} placeholder="Banco (opcional si no es banco)" value={bankName} onChangeText={setBankName} placeholderTextColor={c.textLight} />
            <TextInput style={{ backgroundColor: c.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: c.text, marginBottom: 10 }} placeholder="Numero de cuenta (opcional)" value={accountNumber} onChangeText={setAccountNumber} placeholderTextColor={c.textLight} keyboardType="number-pad" />

            <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 10, marginTop: 4 }}>Tipo</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: accType === t.key ? c.primary : c.border, backgroundColor: accType === t.key ? c.primary + '18' : c.background }}
                  onPress={() => setAccType(t.key)}
                >
                  <Ionicons name={t.icon as any} size={18} color={accType === t.key ? c.primary : c.textSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: accType === t.key ? c.primary : c.textSecondary }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 10, marginTop: 4 }}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CategoryColors.map(col => (
                <TouchableOpacity key={col} style={{ width: selectedColor === col ? 38 : 34, height: selectedColor === col ? 38 : 34, borderRadius: selectedColor === col ? 19 : 17, backgroundColor: col, marginRight: 10, borderWidth: selectedColor === col ? 3 : 0, borderColor: c.text }} onPress={() => setSelectedColor(col)} />
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: c.background, alignItems: 'center' }} onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: c.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' }} onPress={handleSave} activeOpacity={0.7}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
            {editItem && (
              <TouchableOpacity style={{ marginTop: 16, alignItems: 'center', paddingVertical: 10 }} onPress={() => { setModalVisible(false); handleDelete(editItem); }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.expense }}>Eliminar cuenta</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
