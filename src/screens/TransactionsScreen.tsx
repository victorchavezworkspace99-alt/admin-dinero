import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getTransactions, deleteTransaction } from '../database/database';
import { TransactionItem } from '../components/TransactionItem';
import { EmptyState } from '../components/EmptyState';
import { Transaction } from '../types';

export function TransactionsScreen({ navigation }: any) {
  const { colors: c } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    const typeParam = filterType === 'all' ? undefined : filterType;
    return getTransactions(typeParam, undefined, undefined, undefined, search || undefined).then(setTransactions);
  }, [filterType, search]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  };

  const confirmDelete = (tx: Transaction) => {
    const name = tx.type === 'transfer' ? 'Transferencia' : (tx.category_name || 'Sin categoria');
    Alert.alert('Eliminar Transaccion', `Eliminar ${name} por ${tx.amount}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        deleteTransaction(tx.id).then(loadData);
      }},
    ]);
  };

  const FilterBtn = ({ label, value }: { label: string; value: 'all' | 'income' | 'expense' | 'transfer' }) => (
    <TouchableOpacity
      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: filterType === value ? c.primary : c.surface, borderWidth: 1, borderColor: filterType === value ? c.primary : c.border }}
      onPress={() => setFilterType(value)}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: filterType === value ? '#FFFFFF' : c.textSecondary }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>Transacciones</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddTransaction')}>
          <Ionicons name="add-circle" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingHorizontal: 14, height: 44, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }}>
        <Ionicons name="search" size={18} color={c.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={{ flex: 1, fontSize: 15, color: c.text }}
          placeholder="Buscar transacciones..."
          placeholderTextColor={c.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={c.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ height: 50, marginVertical: 8 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['all', 'income', 'expense', 'transfer'] as const}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
          renderItem={({ item }) => {
            const labels = { all: 'Todos', income: 'Ingresos', expense: 'Gastos', transfer: 'Transf.' };
            return <FilterBtn label={labels[item]} value={item} />;
          }}
        />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.primary]} />}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
            onLongPress={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="Sin transacciones" subtitle="Agrega tu primera transaccion para comenzar" />
        }
        contentContainerStyle={transactions.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
