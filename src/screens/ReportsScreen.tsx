import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { Colors } from '../theme/colors';
import { getMonthlySummary, getCategorySummary } from '../database/database';
import { MonthlySummary, CategorySummary } from '../types';
import { formatCurrency } from '../store/SettingsStore';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const screenWidth = Dimensions.get('window').width;

export function ReportsScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<MonthlySummary>({ month, year, income: 0, expense: 0, balance: 0 });
  const [expenseSummary, setExpenseSummary] = useState<CategorySummary[]>([]);
  const [incomeSummary, setIncomeSummary] = useState<CategorySummary[]>([]);
  const [showIncome, setShowIncome] = useState(false);

  useFocusEffect(useCallback(() => {
    getMonthlySummary(month, year).then(setSummary);
    getCategorySummary(month, year, 'expense').then(setExpenseSummary);
    getCategorySummary(month, year, 'income').then(setIncomeSummary);
  }, [month, year]));

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

  const fc = (val: number) => fc(val);

  const currentSummary = showIncome ? incomeSummary : expenseSummary;
  const currentLabel = showIncome ? 'Ingresos' : 'Gastos';
  const toggleLabel = showIncome ? 'Ver Gastos' : 'Ver Ingresos';

  const chartData = currentSummary
    .filter(s => s.total > 0)
    .slice(0, 8)
    .map(s => ({
      name: s.category_name.length > 12 ? s.category_name.substring(0, 12) + '..' : s.category_name,
      total: s.total,
      color: s.color,
      legendFontColor: Colors.textSecondary,
      legendFontSize: 12,
    }));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reportes</Text>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.card, { borderLeftColor: Colors.income }]}>
          <Text style={styles.cardLabel}>Ingresos</Text>
          <Text style={[styles.cardAmount, { color: Colors.income }]}>{fc(summary.income)}</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: Colors.expense }]}>
          <Text style={styles.cardLabel}>Gastos</Text>
          <Text style={[styles.cardAmount, { color: Colors.expense }]}>{fc(summary.expense)}</Text>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Balance del Mes</Text>
        <Text style={[styles.balanceAmount, { color: summary.balance >= 0 ? Colors.income : Colors.expense }]}>
          {fc(summary.balance)}
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.chartTitle}>Distribucion de {currentLabel}</Text>
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowIncome(!showIncome)} activeOpacity={0.7}>
          <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
          <Text style={styles.toggleText}>{toggleLabel}</Text>
        </TouchableOpacity>
      </View>

      {chartData.length > 0 ? (
        <View style={styles.chartContainer}>
          <PieChart
            data={chartData}
            width={screenWidth - 48}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(28, 28, 30, ${opacity * 0.6})`,
            }}
            accessor="total"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute={false}
          />
        </View>
      ) : (
        <View style={styles.noData}>
          <View style={styles.noDataRing}>
            <Ionicons name="bar-chart-outline" size={36} color={Colors.textLight} />
          </View>
          <Text style={styles.noDataText}>Sin datos este mes</Text>
        </View>
      )}

      <View style={styles.legendContainer}>
        {currentSummary.filter(s => s.total > 0).map((s) => (
          <View key={s.category_id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendName}>{s.category_name}</Text>
            <Text style={styles.legendAmount}>{fc(s.total)}</Text>
            <Text style={styles.legendPercent}>{s.percentage.toFixed(1)}%</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.surface, letterSpacing: -0.5 },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 20,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  monthText: { fontSize: 16, fontWeight: '700', color: Colors.text, marginHorizontal: 20, width: 160, textAlign: 'center', letterSpacing: -0.3 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 10 },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  cardAmount: { fontSize: 20, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  balanceCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  balanceAmount: { fontSize: 28, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  toggleText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  chartContainer: { alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 20, padding: 16, shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  noData: { alignItems: 'center', paddingVertical: 48, backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 20, shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  noDataRing: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  noDataText: { fontSize: 14, color: Colors.textLight, marginTop: 12 },
  legendContainer: { paddingHorizontal: 16, marginTop: 12 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 4,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendName: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  legendAmount: { fontSize: 14, fontWeight: '700', color: Colors.text, marginRight: 8, letterSpacing: -0.3 },
  legendPercent: { fontSize: 13, color: Colors.textLight, width: 50, textAlign: 'right', fontWeight: '500' },
});
