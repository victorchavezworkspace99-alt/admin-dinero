import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getBalance, getMonthlySummary, getTransactions, getBalancesByAccount, getSummaryForDateRange } from '../database/database';
import { TransactionItem } from '../components/TransactionItem';
import { EmptyState } from '../components/EmptyState';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { Transaction, MonthlySummary } from '../types';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function pad(n: number) { return n < 10 ? '0' + n : '' + n; }
function formatDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

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
  const [accountBalances, setAccountBalances] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const loadData = useCallback(() => {
    if (dateRange) {
      const s = formatDateStr(dateRange.start);
      const e = formatDateStr(dateRange.end);
      return Promise.all([
        getSummaryForDateRange(s, e).then(r => setSummary({ month, year, ...r })),
        getBalance().then(setBalance),
        getTransactions(undefined, undefined, undefined, undefined, undefined, undefined, s, e).then((tx) => setRecentTx(tx.slice(0, 5))),
        getBalancesByAccount().then(setAccountBalances),
      ]);
    }
    return Promise.all([
      getMonthlySummary(month, year).then(setSummary),
      getBalance().then(setBalance),
      getTransactions(undefined, undefined, month, year).then((tx) => setRecentTx(tx.slice(0, 5))),
      getBalancesByAccount().then(setAccountBalances),
    ]);
  }, [month, year, dateRange]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  };

  const [dayStats, setDayStats] = useState<{ bestDay: string; bestAmount: number; worstDay: string; worstAmount: number; txCount: number }>({ bestDay: '--', bestAmount: 0, worstDay: '--', worstAmount: 0, txCount: 0 });
  useEffect(() => {
    const p = dateRange
      ? getTransactions(undefined, undefined, undefined, undefined, undefined, undefined, formatDateStr(dateRange.start), formatDateStr(dateRange.end))
      : getTransactions(undefined, undefined, month, year);
    p.then((txs) => {
      if (txs.length === 0) return;
      const byDay: Record<string, { income: number; expense: number }> = {};
      for (const tx of txs) {
        if (tx.type === 'transfer') continue;
        const day = tx.date.substring(8, 10) + ' ' + MONTHS[new Date(tx.date).getMonth()];
        if (!byDay[day]) byDay[day] = { income: 0, expense: 0 };
        if (tx.type === 'income') byDay[day].income += tx.amount;
        else byDay[day].expense += tx.amount;
      }
      let bestDay = '', bestAmount = 0, worstDay = '', worstAmount = 0;
      for (const [d, v] of Object.entries(byDay)) {
        const net = v.income - v.expense;
        if (net > bestAmount) { bestDay = d; bestAmount = net; }
        if (net < worstAmount) { worstDay = d; worstAmount = net; }
      }
      setDayStats({ bestDay, bestAmount, worstDay, worstAmount, txCount: txs.length });
    });
      }, [month, year, dateRange]);

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
    accountCard: {
      paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1,
      marginRight: 10, minWidth: 110, alignItems: 'center', gap: 4,
    },
    accountCardName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    accountCardBal: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={s.greeting}>Hola, {userName}</Text>
            <Text style={s.balanceLabel}>Balance Total</Text>
            <Text style={[s.balance, { color: balance >= 0 ? c.income : c.expense }]}>
              {fm(balance)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilter(true)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
            <Ionicons name={dateRange ? "funnel" : "calendar-outline"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.monthText}>{dateRange ? `Filtro activo` : `${MONTHS[month - 1]} ${year}`}</Text>
          {dateRange && (
            <Text style={{ fontSize: 11, color: c.primary, fontWeight: '600', marginTop: -2 }}>
              {`${dateRange.start.getDate()} ${MONTHS_FULL[dateRange.start.getMonth()]} - ${dateRange.end.getDate()} ${MONTHS_FULL[dateRange.end.getMonth()]}`}
            </Text>
          )}
        </View>
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

      {accountBalances.length > 0 && (
        <SpringScale delay={120}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Tus Cuentas</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
            {accountBalances.map((acc) => (
              <View key={acc.id} style={[s.accountCard, { backgroundColor: acc.color + '12', borderColor: acc.color + '30' }]}>
                <Ionicons name={acc.icon as any} size={20} color={acc.color} />
                <Text style={[s.accountCardName, { color: c.text }]}>{acc.name}</Text>
                <Text style={[s.accountCardBal, { color: acc.balance >= 0 ? c.text : c.expense }]}>{fm(acc.balance)}</Text>
              </View>
            ))}
          </ScrollView>
        </SpringScale>
      )}

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

      <DateRangeFilter
        visible={showFilter}
        startDate={dateRange?.start ?? null}
        endDate={dateRange?.end ?? null}
        onApply={(s, e) => setDateRange({ start: s, end: e })}
        onClear={() => setDateRange(null)}
        onClose={() => setShowFilter(false)}
      />
    </ScrollView>
  );
}
