import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { formatCurrency } from '../store/SettingsStore';

interface Props {
  transaction: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function TransactionItem({ transaction, onPress, onLongPress }: Props) {
  const { colors: c } = useTheme();
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? c.income : c.expense;
  const sign = isIncome ? '+' : '\u2212';

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(parts[2])} ${meses[parseInt(parts[1]) - 1] || ''}`;
  };

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, marginHorizontal: 16, marginVertical: 4, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 }}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.6}
    >
      <View style={[styles.iconBox, { backgroundColor: transaction.category_color + '18' }]}>
        <Ionicons name={transaction.category_icon as any} size={20} color={transaction.category_color} />
      </View>
      <View style={styles.info}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, letterSpacing: -0.2 }} numberOfLines={1}>{transaction.category_name}</Text>
        <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2 }} numberOfLines={1}>{transaction.description || 'Sin descripcion'}</Text>
      </View>
      <View style={styles.rightCol}>
          <Text style={[{ fontSize: 15, fontWeight: '700', letterSpacing: -0.3 }, { color: amountColor }]}>
            {sign}{formatCurrency(transaction.amount)}
          </Text>
        <Text style={{ fontSize: 12, color: c.textLight, marginTop: 2 }}>{formatDate(transaction.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const iconBox = { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 };
const info = { flex: 1 };
const rightCol = { alignItems: 'flex-end' };
const styles = { iconBox, info, rightCol };
