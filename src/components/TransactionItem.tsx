import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  const isTransfer = transaction.type === 'transfer';
  const amountColor = isTransfer ? c.text : (isIncome ? c.income : c.expense);
  const sign = isTransfer ? '' : (isIncome ? '+' : '\u2212');

  const title = isTransfer ? 'Transferencia' : (transaction.category_name || 'Sin categoria');
  const iconName = isTransfer ? 'swap-horizontal' : (transaction.category_icon || 'help-circle');
  const iconColor = isTransfer ? c.primary : (transaction.category_color || c.textSecondary);
  const iconBg = isTransfer ? c.primary + '18' : (transaction.category_color || c.textSecondary) + '18';
  const subtitle = isTransfer
    ? `De ${transaction.account_name || '?' } a ${transaction.destination_account_name || '?'}`
    : (transaction.description || 'Sin descripcion');

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
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, letterSpacing: -0.2 }} numberOfLines={1}>{title}</Text>
        <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
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

const styles = StyleSheet.create({
  iconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  rightCol: { alignItems: 'flex-end' },
});
