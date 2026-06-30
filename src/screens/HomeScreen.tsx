import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getBalance, getMonthlySummary, getTransactions } from '../database/database';
import { TransactionItem } from '../components/TransactionItem';
import { EmptyState } from '../components/EmptyState';
import { Transaction, MonthlySummary } from '../types';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function SpringScale({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, stiffness: 120, damping: 14, useNativeDriver: true, delay }),
      Animated.timing(opacity, { toValue: 1, duration: 200, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ transform: [{ scale }], opacity }}>{children}</Animated.View>;
}

export function HomeScreen({ navigation }: any) {
  const { colors: c, formatCurrency, userName } = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<MonthlySummary>({ month, year, income: 0, expense: 0, balance: 0 });
  const [balance, setBalance] = useState(0);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    getMonthlySummary(month, year).then(setSummary);
    getBalance().then(setBalance);
    getTransactions(undefined, undefined, month, year).then((tx) => setRecentTx(tx.slice(0, 5)));
  }, [month, year]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const changeMonth = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const fm = (val: number) => formatCurrency(val);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      backgroundColor: c.primary, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 28,
      borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    },
    greeting: { fontSize: 15, color: '#ffffffcc', fontWeight: '500', letterSpacing: -0.2 },
    balanceLabel: { fontSize: 13, color: '#ffffffaa', marginTop: 8, fontWeight: '500' },
    balance: { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 4, letterSpacing: -1 },
    monthNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginHorizontal: 20 },
    monthBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    },
    monthText: { fontSize: 16, fontWeight: '700', color: c.text, marginHorizontal: 20, width: 100, textAlign: 'center', letterSpacing: -0.3 },
    summaryRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 10 },
    summaryCard: { flex: 1, borderRadius: 20, padding: 16, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
    summaryIcon: {
      width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.7)',
      justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    summaryLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    summaryAmount: { fontSize: 20, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
    quickAdd: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.primary, marginHorizontal: 20, marginTop: 16,
      paddingVertical: 14, borderRadius: 16, gap: 8,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
    },
    quickAddText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
    seeAll: { fontSize: 14, color: c.primary, fontWeight: '600' },
  });

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.primary]} />}
    >
      <View style={s.header}>
        <Text style={s.greeting}>Hola, {userName}</Text>
        <Text style={s.balanceLabel}>Balance Total</Text>
        <Text style={[s.balance, { color: balance >= 0 ? c.income : c.expense }]}>
          {fm(balance)}
        </Text>
      </View>

      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.monthText}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={c.text} />
        </TouchableOpacity>
      </View>

      <SpringScale delay={50}>
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: c.incomeLight }]}>
            <View style={s.summaryIcon}><Ionicons name="arrow-down" size={18} color={c.income} /></View>
            <Text style={s.summaryLabel}>Ingresos</Text>
            <Text style={[s.summaryAmount, { color: c.income }]}>{fm(summary.income)}</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: c.expenseLight }]}>
            <View style={s.summaryIcon}><Ionicons name="arrow-up" size={18} color={c.expense} /></View>
            <Text style={s.summaryLabel}>Gastos</Text>
            <Text style={[s.summaryAmount, { color: c.expense }]}>{fm(summary.expense)}</Text>
          </View>
        </View>
      </SpringScale>

      <SpringScale delay={100}>
        <TouchableOpacity style={s.quickAdd} onPress={() => navigation.navigate('AddTransaction')} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={s.quickAddText}>Nueva Transaccion</Text>
        </TouchableOpacity>
      </SpringScale>

      <SpringScale delay={150}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Transacciones Recientes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')} activeOpacity={0.7}>
            <Text style={s.seeAll}>Ver Todo</Text>
          </TouchableOpacity>
        </View>
      </SpringScale>

      {recentTx.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Sin movimientos este mes" subtitle="Agrega tu primera transaccion para empezar" />
      ) : (
        recentTx.map((tx) => (
          <SpringScale key={tx.id} delay={100}>
            <TransactionItem key={tx.id} transaction={tx} />
          </SpringScale>
        ))
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
