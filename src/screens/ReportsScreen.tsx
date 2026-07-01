import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { useTheme } from '../theme/ThemeContext';
import { getMonthlySummary, getCategorySummary, getCategorySummaryForDateRange, getMonthlyTrends, getBudgets, getTransactions, getSummaryForDateRange } from '../database/database';
import { MonthlySummary, CategorySummary, Budget } from '../types';
import { DateRangeFilter } from '../components/DateRangeFilter';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48;

type Tab = 'resumen' | 'categorias' | 'tendencias' | 'presupuestos' | 'personalizado';

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
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dayStats, setDayStats] = useState<{ bestDayLabel: string; bestAmount: number; worstDayLabel: string; worstAmount: number; txCount: number }>({ bestDayLabel: '', bestAmount: 0, worstDayLabel: '', worstAmount: 0, txCount: 0 });
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  function pad(n: number) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

  useFocusEffect(useCallback(() => {
    if (dateRange) {
      const s = fmtDate(dateRange.start);
      const e = fmtDate(dateRange.end);
      getSummaryForDateRange(s, e).then(r => setSummary({ month, year, ...r }));
      getCategorySummaryForDateRange(s, e, 'expense').then(setExpenseSummary);
      getCategorySummaryForDateRange(s, e, 'income').then(setIncomeSummary);
    } else {
      getMonthlySummary(month, year).then(setSummary);
      getCategorySummary(month, year, 'expense').then(setExpenseSummary);
      getCategorySummary(month, year, 'income').then(setIncomeSummary);
    }
    getMonthlyTrends(6).then(setTrends);
    getBudgets(month, year).then(setBudgets);
    const txPromise = dateRange
      ? getTransactions(undefined, undefined, undefined, undefined, undefined, undefined, fmtDate(dateRange.start), fmtDate(dateRange.end))
      : getTransactions(undefined, undefined, month, year);
    txPromise.then((txs) => {
      if (txs.length === 0) { setDayStats({ bestDayLabel: '', bestAmount: 0, worstDayLabel: '', worstAmount: 0, txCount: 0 }); return; }
      const byDay: Record<string, { income: number; expense: number }> = {};
      for (const tx of txs) {
        const d = new Date(tx.date);
        const label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
        if (!byDay[label]) byDay[label] = { income: 0, expense: 0 };
        if (tx.type === 'income') byDay[label].income += tx.amount;
        else byDay[label].expense += tx.amount;
      }
      let bestLabel = '', bestAmount = 0, worstLabel = '', worstAmount = 0;
      for (const [l, v] of Object.entries(byDay)) {
        const net = v.income - v.expense;
        if (net > bestAmount) { bestLabel = l; bestAmount = net; }
        if (net < worstAmount) { worstLabel = l; worstAmount = net; }
      }
      setDayStats({ bestDayLabel: bestLabel, bestAmount, worstDayLabel: worstLabel, worstAmount, txCount: txs.length });
    });
  }, [month, year, dateRange]));

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
    { key: 'presupuestos', label: 'Presupuestos', icon: 'wallet-outline' },
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
            <Text style={[ss.statVal, { color: c.income }]}>{dayStats.bestAmount > 0 ? formatCurrency(dayStats.bestAmount) : '--'}</Text>
            {dayStats.bestDayLabel ? <Text style={{ fontSize: 10, color: c.textLight, marginTop: 1 }}>{dayStats.bestDayLabel}</Text> : null}
          </View>
          <View style={[ss.statCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
            <View style={[ss.statIcon, { backgroundColor: c.expenseLight }]}>
              <Ionicons name="arrow-up" size={22} color={c.expense} />
            </View>
            <Text style={[ss.statLabel, { color: c.textSecondary }]}>Peor dia</Text>
            <Text style={[ss.statVal, { color: c.expense }]}>{dayStats.worstAmount < 0 ? formatCurrency(Math.abs(dayStats.worstAmount)) : '--'}</Text>
            {dayStats.worstDayLabel ? <Text style={{ fontSize: 10, color: c.textLight, marginTop: 1 }}>{dayStats.worstDayLabel}</Text> : null}
          </View>
          <View style={[ss.statCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
            <View style={[ss.statIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="calendar" size={22} color={c.primary} />
            </View>
            <Text style={[ss.statLabel, { color: c.textSecondary }]}>Trans.</Text>
            <Text style={[ss.statVal, { color: c.text }]}>{dayStats.txCount}</Text>
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

  const renderPresupuestos = () => {
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const budgetPieData = budgets.filter(b => b.amount > 0 && b.category_name).map(b => ({
      name: (b.category_name || '').length > 12 ? (b.category_name || '').substring(0, 12) + '..' : (b.category_name || ''),
      total: b.amount,
      color: b.category_color || c.primary,
      legendFontColor: c.textSecondary,
      legendFontSize: 12,
    }));
    const budgetBarLabels = budgets.filter(b => b.amount > 0 && b.category_name).slice(0, 8).map(b => (b.category_name || '').length > 8 ? (b.category_name || '').substring(0, 8) + '..' : (b.category_name || ''));
    const budgetBarSpent = budgets.filter(b => b.amount > 0).slice(0, 8).map(b => b.spent);
    const budgetBarAmount = budgets.filter(b => b.amount > 0).slice(0, 8).map(b => b.amount);
    const budgetBarData = {
      labels: budgetBarLabels,
      datasets: [
        { data: budgetBarSpent, color: (opacity = 1) => c.expense + Math.round(opacity * 255).toString(16).padStart(2, '0') },
        { data: budgetBarAmount, color: (opacity = 1) => c.primary + Math.round(opacity * 255).toString(16).padStart(2, '0') },
      ],
      legend: ['Gastado', 'Presupuesto'],
    };
    return (
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
        </View>

        {budgets.length === 0 ? (
          <View style={[ss.emptyCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
            <View style={[ss.emptyRing, { backgroundColor: c.background, borderColor: c.border }]}>
              <Ionicons name="wallet-outline" size={36} color={c.textLight} />
            </View>
            <Text style={[ss.emptyText, { color: c.textLight }]}>Sin presupuestos este mes</Text>
          </View>
        ) : (
          <>
            <SpringScale delay={50}>
              <View style={[ss.balanceCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
                <Text style={[ss.balanceLabel, { color: c.textSecondary }]}>Presupuesto Total</Text>
                <View style={ss.budgetTotalRow}>
                  <View style={ss.budgetTotalItem}>
                    <Text style={[ss.budgetTotalLabel, { color: c.textLight }]}>Asignado</Text>
                    <Text style={[ss.budgetTotalAmount, { color: c.text }]}>{formatCurrency(totalBudget)}</Text>
                  </View>
                  <View style={ss.budgetTotalItem}>
                    <Text style={[ss.budgetTotalLabel, { color: c.textLight }]}>Gastado</Text>
                    <Text style={[ss.budgetTotalAmount, { color: c.expense }]}>{formatCurrency(totalSpent)}</Text>
                  </View>
                  <View style={ss.budgetTotalItem}>
                    <Text style={[ss.budgetTotalLabel, { color: c.textLight }]}>Restante</Text>
                    <Text style={[ss.budgetTotalAmount, { color: totalBudget - totalSpent >= 0 ? c.income : c.expense }]}>{formatCurrency(totalBudget - totalSpent)}</Text>
                  </View>
                </View>
                <View style={[ss.progressBar, { backgroundColor: c.border }]}>
                  <View style={[ss.progressFill, { width: `${Math.min((totalSpent / Math.max(totalBudget, 1)) * 100, 100)}%`, backgroundColor: (totalSpent / Math.max(totalBudget, 1)) > 0.8 ? c.warning : c.primary }]} />
                </View>
                <Text style={[ss.budgetPercentText, { color: c.textSecondary }]}>
                  {((totalSpent / Math.max(totalBudget, 1)) * 100).toFixed(0)}% del presupuesto utilizado
                </Text>
              </View>
            </SpringScale>

            {budgetPieData.length > 0 && (
              <SpringScale delay={100}>
                <View style={[ss.chartCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
                  <Text style={[ss.sectionTitle, { color: c.text }]}>Distribucion del Presupuesto</Text>
                  <PieChart
                    data={budgetPieData}
                    width={CHART_WIDTH}
                    height={190}
                    chartConfig={chartConfig}
                    accessor="total"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute={false}
                  />
                </View>
              </SpringScale>
            )}

            {budgetBarData.labels.length > 0 && (
              <SpringScale delay={150}>
                <View style={[ss.sectionCard, { backgroundColor: c.surface, shadowColor: c.cardShadow }]}>
                  <Text style={[ss.sectionTitle, { color: c.text }]}>Gasto vs Presupuesto</Text>
                  <Text style={[ss.sectionSub, { color: c.textSecondary }]}>Por categoria</Text>
                  <BarChart
                    data={budgetBarData}
                    width={CHART_WIDTH - 32}
                    height={220}
                    chartConfig={chartConfig}
                    yAxisLabel="$"
                    yAxisSuffix=""
                    fromZero
                  />
                </View>
              </SpringScale>
            )}

            <View style={ss.legendWrap}>
              {budgets.map((b, i) => {
                const percent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
                const isOver = percent > 100;
                return (
                  <SpringScale key={b.id} delay={i * 30}>
                    <View style={[ss.budgetItem, { backgroundColor: c.surface }]}>
                      <View style={ss.budgetItemLeft}>
                        <View style={[ss.budgetItemIcon, { backgroundColor: (b.category_color || c.primary) + '18' }]}>
                          <Ionicons name={(b.category_icon || 'ellipsis-horizontal') as any} size={18} color={b.category_color || c.primary} />
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[ss.budgetItemName, { color: c.text }]}>{b.category_name}</Text>
                            {b.is_recurring === 1 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 }}>
                                <Ionicons name="repeat" size={10} color={c.primary} />
                                <Text style={{ fontSize: 10, fontWeight: '600', color: c.primary }}>Fijo</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[ss.budgetItemMeta, { color: c.textSecondary }]}>
                            {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[ss.budgetItemPercent, { color: isOver ? c.expense : c.primary }]}>
                        {percent.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={[ss.progressBar, { backgroundColor: c.border }]}>
                      <View style={[ss.progressFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: isOver ? c.expense : c.primary }]} />
                    </View>
                  </SpringScale>
                );
              })}
            </View>
          </>
        )}
      </>
    );
  };

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={ss.title}>Reportes</Text>
          <TouchableOpacity onPress={() => setShowFilter(true)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
            <Ionicons name={dateRange ? "funnel" : "calendar-outline"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {dateRange && (
          <Text style={{ fontSize: 12, color: '#ffffffcc', marginTop: 4, fontWeight: '500' }}>
            {`${dateRange.start.getDate()} ${MONTHS[dateRange.start.getMonth()]} - ${dateRange.end.getDate()} ${MONTHS[dateRange.end.getMonth()]} ${dateRange.end.getFullYear()}`}
          </Text>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[ss.tabBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[ss.tab, tab === t.key && [ss.tabActive, { borderBottomColor: c.primary }]]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? c.primary : c.textLight} />
            <Text style={[ss.tabLabel, { color: tab === t.key ? c.primary : c.textLight }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {tab === 'resumen' && renderResumen()}
        {tab === 'categorias' && renderCategorias()}
        {tab === 'tendencias' && renderTendencias()}
        {tab === 'presupuestos' && renderPresupuestos()}
        {tab === 'personalizado' && renderPersonalizado()}
        <View style={{ height: 100 }} />
      </ScrollView>

      <DateRangeFilter
        visible={showFilter}
        startDate={dateRange?.start ?? null}
        endDate={dateRange?.end ?? null}
        onApply={(s, e) => setDateRange({ start: s, end: e })}
        onClear={() => setDateRange(null)}
        onClose={() => setShowFilter(false)}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 6 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },

  tabBar: { flexGrow: 0, height: 44, borderBottomWidth: 1, paddingHorizontal: 0 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: '100%', paddingHorizontal: 6, gap: 2, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomWidth: 2 },
  tabLabel: { fontSize: 12, fontWeight: '600' },

  balanceCard: { marginHorizontal: 16, marginTop: 4, borderRadius: 24, padding: 24, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3 },
  balanceLabel: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  balanceAmount: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginTop: 6, letterSpacing: -1 },
  balanceMiniRow: { flexDirection: 'row', marginTop: 20, gap: 16 },
  balanceMiniItem: { flex: 1, alignItems: 'center' },
  balanceMiniDot: { width: 8, height: 8, borderRadius: 4 },
  balanceMiniLabel: { fontSize: 12, marginTop: 4 },
  balanceMiniVal: { fontSize: 15, fontWeight: '700', marginTop: 2 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 6, gap: 8 },
  statCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1 },
  statIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, marginTop: 6, fontWeight: '500' },
  statVal: { fontSize: 16, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },

  sectionCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 22, padding: 20, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, marginTop: 2, marginBottom: 12 },

  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 4 },
  monthNav: { flexDirection: 'row', alignItems: 'center' },
  monthBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3, elevation: 1 },
  monthText: { fontSize: 15, fontWeight: '700', marginHorizontal: 14, letterSpacing: -0.3 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
  toggleText: { fontSize: 12, fontWeight: '600' },

  chartCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 22, padding: 16, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  emptyCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 22, padding: 48, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  emptyRing: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  emptyText: { fontSize: 14, marginTop: 12 },

  legendWrap: { paddingHorizontal: 16, marginTop: 4, paddingBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, marginBottom: 4, overflow: 'hidden' },
  legendBar: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.12, borderRadius: 14 },
  legendName: { flex: 1, fontSize: 14, fontWeight: '500' },
  legendAmount: { fontSize: 14, fontWeight: '700', marginRight: 8, letterSpacing: -0.3 },
  legendPercent: { fontSize: 13, width: 40, textAlign: 'right', fontWeight: '500' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendDotBig: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },

  budgetTotalRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  budgetTotalItem: { flex: 1, alignItems: 'center', backgroundColor: 'transparent' },
  budgetTotalLabel: { fontSize: 11, fontWeight: '500' },
  budgetTotalAmount: { fontSize: 16, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetPercentText: { fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '500' },
  budgetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  budgetItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  budgetItemIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  budgetItemName: { fontSize: 14, fontWeight: '600' },
  budgetItemMeta: { fontSize: 11, marginTop: 2 },
  budgetItemPercent: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
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
