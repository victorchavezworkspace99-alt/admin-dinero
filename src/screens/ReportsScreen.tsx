import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { useTheme } from '../theme/ThemeContext';
import { getMonthlySummary, getCategorySummary, getCategorySummaryForDateRange, getMonthlyTrends } from '../database/database';
import { MonthlySummary, CategorySummary } from '../types';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48;

type Tab = 'resumen' | 'categorias' | 'tendencias' | 'personalizado';

function SpringScale({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, stiffness: 110, damping: 16, useNativeDriver: true, delay }),
      Animated.timing(opacity, { toValue: 1, duration: 200, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ transform: [{ scale }], opacity }}>{children}</Animated.View>;
}

export function ReportsScreen() {
  const { colors: c, formatCurrency } = useTheme();
  const now = new Date();
  const [tab, setTab] = useState<Tab>('resumen');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<MonthlySummary>({ month, year, income: 0, expense: 0, balance: 0 });
  const [expenseSummary, setExpenseSummary] = useState<CategorySummary[]>([]);
  const [incomeSummary, setIncomeSummary] = useState<CategorySummary[]>([]);
  const [showIncome, setShowIncome] = useState(false);
  const [trends, setTrends] = useState<{ month: number; year: number; income: number; expense: number }[]>([]);

  useFocusEffect(useCallback(() => {
    getMonthlySummary(month, year).then(setSummary);
    getCategorySummary(month, year, 'expense').then(setExpenseSummary);
    getCategorySummary(month, year, 'income').then(setIncomeSummary);
    getMonthlyTrends(6).then(setTrends);
  }, [month, year]));

  const changeMonth = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const currentSummary = showIncome ? incomeSummary : expenseSummary;
  const currentLabel = showIncome ? 'Ingresos' : 'Gastos';
  const toggleLabel = showIncome ? 'Ver Gastos' : 'Ver Ingresos';

  const chartPieData = currentSummary
    .filter(s => s.total > 0)
    .slice(0, 8)
    .map(s => ({
      name: s.category_name.length > 12 ? s.category_name.substring(0, 12) + '..' : s.category_name,
      total: s.total,
      color: s.color,
      legendFontColor: c.textSecondary,
      legendFontSize: 12,
    }));

  const chartBarData = {
    labels: trends.map(t => MONTHS[t.month - 1].substring(0, 3)),
    datasets: [
      { data: trends.map(t => t.income), color: (opacity = 1) => c.income + Math.round(opacity * 255).toString(16).padStart(2, '0') },
      { data: trends.map(t => t.expense), color: (opacity = 1) => c.expense + Math.round(opacity * 255).toString(16).padStart(2, '0') },
    ],
    legend: ['Ingresos', 'Gastos'],
  };

  const chartLineData = {
    labels: trends.map(t => MONTHS[t.month - 1].substring(0, 3)),
    datasets: [
      {
        data: trends.map(t => t.income - t.expense),
        color: (opacity = 1) => c.primary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: c.surface,
    backgroundGradientFrom: c.surface,
    backgroundGradientTo: c.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => c.text + Math.round(opacity * 60).toString(16).padStart(2, '0'),
    labelColor: () => c.textSecondary,
    propsForBackgroundLines: { stroke: c.border },
    propsForLabels: { fontSize: 11, fontWeight: '600' },
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'resumen', label: 'Resumen', icon: 'speedometer-outline' },
    { key: 'categorias', label: 'Categorias', icon: 'pie-chart-outline' },
    { key: 'tendencias', label: 'Tendencias', icon: 'trending-up-outline' },
    { key: 'personalizado', label: 'Filtros', icon: 'options-outline' },
  ];

  const renderResumen = () => (
    <>
      <SpringScale delay={50}>
        <View style={[ss.balanceCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
          <Text style={[ss.balanceLabel, { color: c.textSecondary }]}>Balance del Mes</Text>
          <Text style={[ss.balanceAmount, { color: summary.balance >= 0 ? c.income : c.expense }]}>
            {formatCurrency(summary.balance)}
          </Text>
          <View style={ss.balanceMiniRow}>
            <View style={ss.balanceMiniItem}>
              <View style={[ss.balanceMiniDot, { backgroundColor: c.income }]} />
              <Text style={[ss.balanceMiniLabel, { color: c.textSecondary }]}>Ingresos</Text>
              <Text style={[ss.balanceMiniVal, { color: c.income }]}>{formatCurrency(summary.income)}</Text>
            </View>
            <View style={ss.balanceMiniItem}>
              <View style={[ss.balanceMiniDot, { backgroundColor: c.expense }]} />
              <Text style={[ss.balanceMiniLabel, { color: c.textSecondary }]}>Gastos</Text>
              <Text style={[ss.balanceMiniVal, { color: c.expense }]}>{formatCurrency(summary.expense)}</Text>
            </View>
          </View>
        </View>
      </SpringScale>

      <SpringScale delay={100}>
        <View style={ss.statsRow}>
          <View style={[ss.statCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
            <View style={[ss.statIcon, { backgroundColor: c.incomeLight }]}>
              <Ionicons name="arrow-down" size={22} color={c.income} />
            </View>
            <Text style={[ss.statLabel, { color: c.textSecondary }]}>Mejor dia</Text>
            <Text style={[ss.statVal, { color: c.text }]}>--</Text>
          </View>
          <View style={[ss.statCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
            <View style={[ss.statIcon, { backgroundColor: c.expenseLight }]}>
              <Ionicons name="arrow-up" size={22} color={c.expense} />
            </View>
            <Text style={[ss.statLabel, { color: c.textSecondary }]}>Peor dia</Text>
            <Text style={[ss.statVal, { color: c.text }]}>--</Text>
          </View>
          <View style={[ss.statCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
            <View style={[ss.statIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="calendar" size={22} color={c.primary} />
            </View>
            <Text style={[ss.statLabel, { color: c.textSecondary }]}>Trans.</Text>
            <Text style={[ss.statVal, { color: c.text }]}>--</Text>
          </View>
        </View>
      </SpringScale>

      <SpringScale delay={150}>
        <View style={[ss.sectionCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
          <Text style={[ss.sectionTitle, { color: c.text }]}>Distribucion Rapida</Text>
          {chartPieData.length > 0 ? (
            <PieChart
              data={chartPieData.slice(0, 5)}
              width={CHART_WIDTH - 32}
              height={160}
              chartConfig={chartConfig}
              accessor="total"
              backgroundColor="transparent"
              paddingLeft="10"
              absolute={false}
            />
          ) : (
            <View style={ss.noDataRow}>
              <Ionicons name="pie-chart-outline" size={28} color={c.textLight} />
              <Text style={[ss.noDataText, { color: c.textLight }]}>Sin datos este mes</Text>
            </View>
          )}
        </View>
      </SpringScale>
    </>
  );

  const renderCategorias = () => (
    <>
      <View style={ss.filterRow}>
        <View style={ss.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={[ss.monthBtn, { backgroundColor: c.surface, shadowColor: c.cardShadow }]} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={[ss.monthText, { color: c.text }]}>{MONTHS[month - 1]} {year}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={[ss.monthBtn, { backgroundColor: c.surface, shadowColor: c.cardShadow }]} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color={c.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[ss.toggleBtn, { backgroundColor: c.primaryLight }]} onPress={() => setShowIncome(!showIncome)} activeOpacity={0.7}>
          <Ionicons name="swap-horizontal" size={16} color={c.primary} />
          <Text style={[ss.toggleText, { color: c.primary }]}>{toggleLabel}</Text>
        </TouchableOpacity>
      </View>

      {chartPieData.length > 0 ? (
        <SpringScale delay={50}>
          <View style={[ss.chartCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
            <PieChart
              data={chartPieData}
              width={CHART_WIDTH}
              height={200}
              chartConfig={chartConfig}
              accessor="total"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute={false}
            />
          </View>
        </SpringScale>
      ) : (
        <View style={[ss.emptyCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
          <View style={[ss.emptyRing, { backgroundColor: c.background, borderColor: c.border }]}>
            <Ionicons name="bar-chart-outline" size={36} color={c.textLight} />
          </View>
          <Text style={[ss.emptyText, { color: c.textLight }]}>Sin {currentLabel.toLowerCase()} este mes</Text>
        </View>
      )}

      <View style={ss.legendWrap}>
        {currentSummary.filter(s => s.total > 0).map((s, i) => (
          <SpringScale key={s.category_id} delay={i * 30}>
            <View style={[ss.legendItem, { backgroundColor: c.surface }]}>
              <View style={[ss.legendBar, { backgroundColor: s.color, width: `${Math.max(s.percentage, 2)}%` }]} />
              <Text style={[ss.legendName, { color: c.text }]}>{s.category_name}</Text>
              <Text style={[ss.legendAmount, { color: c.text }]}>{formatCurrency(s.total)}</Text>
              <Text style={[ss.legendPercent, { color: c.textLight }]}>{s.percentage.toFixed(0)}%</Text>
            </View>
          </SpringScale>
        ))}
      </View>
    </>
  );

  const renderTendencias = () => (
    <>
      <SpringScale delay={50}>
        <View style={[ss.sectionCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
          <Text style={[ss.sectionTitle, { color: c.text }]}>Ingresos vs Gastos</Text>
          <Text style={[ss.sectionSub, { color: c.textSecondary }]}>Ultimos 6 meses</Text>
          {trends.some(t => t.income > 0 || t.expense > 0) ? (
            <BarChart
              data={chartBarData}
              width={CHART_WIDTH - 32}
              height={200}
              chartConfig={chartConfig}
              yAxisLabel="$"
              yAxisSuffix=""
              fromZero
            />
          ) : (
            <View style={ss.noDataRow}>
              <Ionicons name="bar-chart-outline" size={28} color={c.textLight} />
              <Text style={[ss.noDataText, { color: c.textLight }]}>Agrega transacciones para ver tendencias</Text>
            </View>
          )}
        </View>
      </SpringScale>

      <SpringScale delay={100}>
        <View style={[ss.sectionCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
          <Text style={[ss.sectionTitle, { color: c.text }]}>Balance Mensual</Text>
          <Text style={[ss.sectionSub, { color: c.textSecondary }]}>Evolucion del balance</Text>
          {trends.some(t => t.income > 0 || t.expense > 0) ? (
            <LineChart
              data={chartLineData}
              width={CHART_WIDTH - 32}
              height={180}
              chartConfig={chartConfig}
              bezier
              yAxisLabel="$"
              yAxisSuffix=""
            />
          ) : (
            <View style={ss.noDataRow}>
              <Ionicons name="trending-up-outline" size={28} color={c.textLight} />
              <Text style={[ss.noDataText, { color: c.textLight }]}>Sin datos suficientes</Text>
            </View>
          )}
        </View>
      </SpringScale>

      {trends.map((t, i) => (
        <SpringScale key={`${t.month}-${t.year}`} delay={i * 40}>
          <View style={[ss.trendRow, { backgroundColor: c.surface }]}>
            <Text style={[ss.trendMonth, { color: c.text }]}>{MONTHS[t.month - 1]} {t.year}</Text>
            <View style={ss.trendAmounts}>
              <View style={ss.trendItem}>
                <View style={[ss.trendDot, { backgroundColor: c.income }]} />
                <Text style={[ss.trendVal, { color: c.income }]}>{formatCurrency(t.income)}</Text>
              </View>
              <View style={ss.trendItem}>
                <View style={[ss.trendDot, { backgroundColor: c.expense }]} />
                <Text style={[ss.trendVal, { color: c.expense }]}>{formatCurrency(t.expense)}</Text>
              </View>
              <Text style={[ss.trendBalance, { color: t.income - t.expense >= 0 ? c.income : c.expense }]}>
                {formatCurrency(t.income - t.expense)}
              </Text>
            </View>
          </View>
        </SpringScale>
      ))}
    </>
  );

  const renderPersonalizado = () => (
    <>
      <SpringScale delay={50}>
        <View style={[ss.sectionCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
          <Text style={[ss.sectionTitle, { color: c.text }]}>Filtros de Reporte</Text>
          <View style={ss.filterGroup}>
            <View style={ss.filterRow2}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={[ss.miniBtn, { backgroundColor: c.background }]} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={c.text} />
              </TouchableOpacity>
              <Text style={[ss.filterLabel, { color: c.text }]}>{MONTHS[month - 1]} {year}</Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={[ss.miniBtn, { backgroundColor: c.background }]} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={c.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={ss.filterGroup}>
            <Text style={[ss.filterLabel, { color: c.text }]}>Tipo</Text>
            <View style={ss.typeToggle}>
              {(['expense', 'income'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[ss.typeBtn, { backgroundColor: c.background }, showIncome === (t === 'income') && { backgroundColor: c.primary }]}
                  onPress={() => setShowIncome(t === 'income')}
                >
                  <Text style={[ss.typeBtnText, { color: c.textSecondary }, showIncome === (t === 'income') && { color: '#FFFFFF' }]}>
                    {t === 'income' ? 'Ingresos' : 'Gastos'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </SpringScale>

      {chartPieData.length > 0 && (
        <SpringScale delay={100}>
          <View style={[ss.chartCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
            <Text style={[ss.sectionTitle, { color: c.text }]}>Distribucion de {currentLabel}</Text>
            <PieChart
              data={chartPieData}
              width={CHART_WIDTH}
              height={200}
              chartConfig={chartConfig}
              accessor="total"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute={false}
            />
          </View>
        </SpringScale>
      )}

      <View style={ss.legendWrap}>
        {currentSummary.filter(s => s.total > 0).map((s, i) => (
          <TouchableOpacity key={s.category_id} activeOpacity={0.7}>
            <View style={[ss.customLegendItem, { backgroundColor: c.surface }]}>
              <View style={[ss.legendDotBig, { backgroundColor: s.color }]} />
              <View style={ss.customLegendInfo}>
                <Text style={[ss.legendName, { color: c.text }]}>{s.category_name}</Text>
                <View style={ss.customLegendMeta}>
                  <Text style={[ss.legendAmount, { color: c.text }]}>{formatCurrency(s.total)}</Text>
                  <Text style={[ss.legendPercent, { color: c.textLight }]}>{s.percentage.toFixed(1)}%</Text>
                </View>
              </View>
              <View style={[ss.legendProgress, { backgroundColor: c.background }]}>
                <View style={[ss.legendProgressFill, { backgroundColor: s.color, width: `${s.percentage}%` }]} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <View style={[ss.container, { backgroundColor: c.background }]}>
      <View style={[ss.header, { backgroundColor: c.primary }]}>
        <Text style={ss.title}>Reportes</Text>
      </View>

      <View style={[ss.tabBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[ss.tab, tab === t.key && [ss.tabActive, { borderBottomColor: c.primary }]]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={t.icon as any} size={18} color={tab === t.key ? c.primary : c.textLight} />
            <Text style={[ss.tabLabel, { color: tab === t.key ? c.primary : c.textLight }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {tab === 'resumen' && renderResumen()}
        {tab === 'categorias' && renderCategorias()}
        {tab === 'tendencias' && renderTendencias()}
        {tab === 'personalizado' && renderPersonalizado()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomWidth: 2 },
  tabLabel: { fontSize: 12, fontWeight: '600' },

  balanceCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 24, padding: 24, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3 },
  balanceLabel: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  balanceAmount: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginTop: 6, letterSpacing: -1 },
  balanceMiniRow: { flexDirection: 'row', marginTop: 20, gap: 16 },
  balanceMiniItem: { flex: 1, alignItems: 'center' },
  balanceMiniDot: { width: 8, height: 8, borderRadius: 4 },
  balanceMiniLabel: { fontSize: 12, marginTop: 4 },
  balanceMiniVal: { fontSize: 15, fontWeight: '700', marginTop: 2 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  statCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1 },
  statIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, marginTop: 6, fontWeight: '500' },
  statVal: { fontSize: 16, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },

  sectionCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 22, padding: 20, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, marginTop: 2, marginBottom: 12 },

  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center' },
  monthBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3, elevation: 1 },
  monthText: { fontSize: 15, fontWeight: '700', marginHorizontal: 14, letterSpacing: -0.3 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
  toggleText: { fontSize: 12, fontWeight: '600' },

  chartCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 22, padding: 16, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  emptyCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 22, padding: 48, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  emptyRing: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  emptyText: { fontSize: 14, marginTop: 12 },

  legendWrap: { paddingHorizontal: 16, marginTop: 8, paddingBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, marginBottom: 4, overflow: 'hidden' },
  legendBar: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.12, borderRadius: 14 },
  legendName: { flex: 1, fontSize: 14, fontWeight: '500' },
  legendAmount: { fontSize: 14, fontWeight: '700', marginRight: 8, letterSpacing: -0.3 },
  legendPercent: { fontSize: 13, width: 40, textAlign: 'right', fontWeight: '500' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendDotBig: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },

  noDataRow: { alignItems: 'center', paddingVertical: 20 },
  noDataText: { fontSize: 13, marginTop: 8 },

  trendRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginBottom: 4 },
  trendMonth: { fontSize: 13, fontWeight: '600', width: 70 },
  trendAmounts: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  trendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendDot: { width: 6, height: 6, borderRadius: 3 },
  trendVal: { fontSize: 12, fontWeight: '600' },
  trendBalance: { fontSize: 13, fontWeight: '800', width: 80, textAlign: 'right', letterSpacing: -0.3 },

  customLegendItem: { borderRadius: 16, padding: 14, marginBottom: 6, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3, elevation: 1 },
  customLegendInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customLegendMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendProgress: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  legendProgressFill: { height: '100%', borderRadius: 2 },

  filterGroup: { marginTop: 16 },
  filterRow2: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterLabel: { fontSize: 15, fontWeight: '600' },
  typeToggle: { flexDirection: 'row', backgroundColor: 'transparent', borderRadius: 12, marginTop: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
});
