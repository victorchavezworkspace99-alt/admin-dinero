import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types';
import { Colors } from '../theme/colors';
import { formatCurrency } from '../store/SettingsStore';

interface Props {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function TransactionItem({ transaction, onPress, onLongPress }: Props) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? Colors.income : Colors.expense;
  const sign = isIncome ? '+' : '\u2212';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.6}
    >
      <View style={[styles.iconBox, { backgroundColor: transaction.category_color + '18' }]}>
        <Ionicons name={transaction.category_icon as any} size={20} color={transaction.category_color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.category} numberOfLines={1}>{transaction.category_name}</Text>
        <Text style={styles.note} numberOfLines={1}>{transaction.description || 'Sin descripcion'}</Text>
      </View>
      <View style={styles.rightCol}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {sign}{formatCurrency(transaction.amount)}
          </Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  category: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  note: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rightCol: { alignItems: 'flex-end' },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
});
