import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, CategoryColors } from '../theme/colors';
import { getAccounts, addAccount, updateAccount, deleteAccount, getAccountBalance } from '../database/database';
import { Account, AccountType } from '../types';

const ACCOUNT_ICONS = ['cash-outline', 'business-outline', 'phone-portrait-outline', 'wallet-outline', 'card-outline', 'save-outline', 'trending-up-outline', 'globe-outline'];
const ACCOUNT_TYPES: { key: AccountType; label: string; icon: string }[] = [
  { key: 'cash', label: 'Efectivo', icon: 'cash-outline' },
  { key: 'bank', label: 'Banco', icon: 'business-outline' },
  { key: 'digital', label: 'Billetera Digital', icon: 'phone-portrait-outline' },
];

export function ManageAccountsScreen({ navigation }: any) {
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
    if (item.is_default) { Alert.alert('No disponible', 'No se puede eliminar una cuenta por defecto'); return; }
    Alert.alert('Eliminar cuenta', `Se desvincularan las transacciones de "${item.name}"`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await deleteAccount(item.id);
        load();
      }},
    ]);
  };

  const typeLabel = (t: AccountType) => ACCOUNT_TYPES.find(a => a.key === t)?.label || t;
  const typeIcon = (t: AccountType) => ACCOUNT_TYPES.find(a => a.key === t)?.icon || 'ellipsis-horizontal';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.title}>Cuentas</Text>
        <TouchableOpacity onPress={openAdd} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
            <View style={[styles.cardIcon, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardType}>{typeLabel(item.type)}{item.bank_name ? ` - ${item.bank_name}` : ''}</Text>
              {item.account_number ? <Text style={styles.cardNum}>Nro: {item.account_number}</Text> : null}
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.cardBalance, { color: (balances[item.id] ?? 0) >= 0 ? Colors.text : Colors.expense }]}>
                S/ {(balances[item.id] ?? 0).toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editItem ? 'Editar' : 'Nueva'} Cuenta</Text>

            <TextInput style={styles.input} placeholder="Nombre" value={name} onChangeText={setName} placeholderTextColor={Colors.textLight} />
            <TextInput style={styles.input} placeholder="Banco (opcional si no es banco)" value={bankName} onChangeText={setBankName} placeholderTextColor={Colors.textLight} />
            <TextInput style={styles.input} placeholder="Numero de cuenta (opcional)" value={accountNumber} onChangeText={setAccountNumber} placeholderTextColor={Colors.textLight} keyboardType="number-pad" />

            <Text style={styles.sectionLabel}>Tipo</Text>
            <View style={styles.typeRow}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, accType === t.key && { backgroundColor: Colors.primary + '18', borderColor: Colors.primary }]}
                  onPress={() => setAccType(t.key)}
                >
                  <Ionicons name={t.icon as any} size={18} color={accType === t.key ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.typeLabel, { color: accType === t.key ? Colors.primary : Colors.textSecondary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CategoryColors.map(c => (
                <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSel]} onPress={() => setSelectedColor(c)} />
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
            {editItem && !editItem.is_default && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => { setModalVisible(false); handleDelete(editItem); }}>
                <Text style={styles.deleteText}>Eliminar cuenta</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: 20, paddingBottom: 16,
  },
  headerBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.surface, letterSpacing: -0.3 },
  list: { padding: 16, gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 8,
    shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  cardType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardNum: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardBalance: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 20, letterSpacing: -0.3 },
  input: {
    backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    color: Colors.text, marginBottom: 10,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  typeLabel: { fontSize: 13, fontWeight: '600' },
  colorDot: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  colorDotSel: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: Colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.surface },
  deleteBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  deleteText: { fontSize: 14, fontWeight: '600', color: Colors.expense },
});
