import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getBudgets, setBudget, updateBudget, deleteBudget, getCategories, getTransactions } from '../database/database';
import { Budget, Category } from '../types';
import { DateRangeFilter } from '../components/DateRangeFilter';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function BudgetsScreen() {
  const { colors: c, formatCurrency } = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  function pad(n: number) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(0);

  useFocusEffect(useCallback(() => {
    getBudgets(month, year).then((budgets) => {
      if (dateRange) {
        getTransactions(undefined, undefined, undefined, undefined, undefined, undefined, fmtDate(dateRange.start), fmtDate(dateRange.end)).then((txs) => {
          const spentByCat: Record<number, number> = {};
          for (const tx of txs) {
            if (tx.type === 'expense') {
              spentByCat[tx.category_id] = (spentByCat[tx.category_id] || 0) + tx.amount;
            }
          }
          setBudgets(budgets.map(b => ({ ...b, spent: spentByCat[b.category_id] || 0 })));
        });
      } else {
        setBudgets(budgets);
      }
    });
    getCategories('expense').then(setCategories);
  }, [month, year, dateRange]));

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
    getBudgets(m, y).then(setBudgets);
  };

  const openAdd = () => {
    setEditingBudget(null);
    setSelectedCategory(null);
    setBudgetAmount('');
    setIsRecurring(0);
    setModalVisible(true);
  };

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget);
    const cat = categories.find(cat => cat.id === budget.category_id);
    setSelectedCategory(cat || null);
    setBudgetAmount(budget.amount.toString());
    setIsRecurring(budget.is_recurring || 0);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) {
      Alert.alert('Categoria Requerida', 'Selecciona una categoria');
      return;
    }
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      Alert.alert('Monto Invalido', 'Ingresa un monto mayor a cero');
      return;
    }
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, parseFloat(budgetAmount), isRecurring);
      } else {
        await setBudget(selectedCategory.id, parseFloat(budgetAmount), month, year, isRecurring);
      }
      setModalVisible(false);
      getBudgets(month, year).then(setBudgets);
    } catch {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const handleDelete = (budget: Budget) => {
    Alert.alert('Eliminar Presupuesto', `Eliminar presupuesto de ${budget.category_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        deleteBudget(budget.id).then(() => getBudgets(month, year).then(setBudgets));
      }},
    ]);
  };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const [catSearch, setCatSearch] = useState('');
  const availableCats = useMemo(() => {
    const q = catSearch.toLowerCase();
    return categories.filter(cat => {
      const alreadyHas = budgets.some(b => b.category_id === cat.id && b.id !== (editingBudget?.id || -1));
      return !alreadyHas && cat.name.toLowerCase().includes(q);
    });
  }, [categories, budgets, catSearch, editingBudget]);

  const s = {
    container: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
    title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    monthNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginHorizontal: 20 },
    monthBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
    monthText: { fontSize: 16, fontWeight: '700', color: c.text, marginHorizontal: 20, width: 160, textAlign: 'center', letterSpacing: -0.3 },
    totalCard: { backgroundColor: c.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
    totalLabel: { fontSize: 14, color: c.textSecondary, textAlign: 'center', fontWeight: '500' },
    totalAmount: { fontSize: 28, fontWeight: '800', color: c.text, textAlign: 'center', marginTop: 4, letterSpacing: -1 },
    totalSpent: { fontSize: 13, color: c.textLight, textAlign: 'center', marginTop: 6, fontWeight: '500' },
    budgetCard: { backgroundColor: c.surface, marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
    budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    budgetIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    budgetName: { fontSize: 15, fontWeight: '600', color: c.text, letterSpacing: -0.2 },
    budgetMeta: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    budgetPercent: { fontSize: 16, fontWeight: '800', color: c.primary, letterSpacing: -0.3 },
    progressBar: { height: 6, backgroundColor: c.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
    progressFill: { height: '100%', borderRadius: 3 },
    emptyState: { alignItems: 'center', paddingVertical: 80 },
    emptyRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: c.border },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: c.textSecondary, marginTop: 16, letterSpacing: -0.3 },
    emptySub: { fontSize: 14, color: c.textLight, marginTop: 6, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,28,30,0.4)' },
    modalContent: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 16, letterSpacing: -0.4 },
    modalLabel: { fontSize: 14, fontWeight: '600', color: c.textSecondary, marginBottom: 8 },
    catSearchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.background, borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 6, marginBottom: 10 },
    catSearchField: { flex: 1, fontSize: 14, color: c.text, paddingVertical: 0 },
    catOption: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', marginRight: 8 },
    catOptionLabel: { fontSize: 12, color: c.text, marginTop: 4, fontWeight: '500' },
    amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.background, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 },
    currencySign: { fontSize: 20, fontWeight: '600', color: c.textSecondary, marginRight: 4 },
    amountField: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text, paddingVertical: 14, letterSpacing: -0.5 },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.background },
    cancelText: { fontSize: 16, fontWeight: '600', color: c.textSecondary },
    saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.primary },
    saveText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    typeToggle: { flexDirection: 'row', backgroundColor: c.background, borderRadius: 14, padding: 4, marginBottom: 8, gap: 4 },
    typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 11, gap: 4 },
    typeOptionActive: { backgroundColor: c.primary },
    typeOptionText: { fontSize: 14, fontWeight: '600', color: c.text },
    typeOptionTextActive: { color: '#FFFFFF' },
    recurringBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 },
    recurringBadgeText: { fontSize: 10, fontWeight: '600', color: c.primary },
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Presupuestos</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setShowFilter(true)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
            <Ionicons name={dateRange ? "funnel" : "calendar-outline"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openAdd}>
            <Ionicons name="add-circle" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      {dateRange && (
        <Text style={[{ textAlign: 'center', fontSize: 12, color: c.primary, fontWeight: '600', paddingVertical: 6, backgroundColor: c.primary + '0a' }]}>
          Filtrando: {`${dateRange.start.getDate()}/${dateRange.start.getMonth() + 1}`} - {`${dateRange.end.getDate()}/${dateRange.end.getMonth() + 1}`}
        </Text>
      )}

      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={[s.monthText, dateRange && { opacity: 0.5 }]}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={c.text} />
        </TouchableOpacity>
      </View>

      {budgets.length > 0 && (
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Presupuesto Total</Text>
          <Text style={s.totalAmount}>{formatCurrency(totalBudget)}</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`, backgroundColor: (totalSpent / totalBudget) > 0.8 ? c.warning : c.primary }]} />
          </View>
          <Text style={s.totalSpent}>Gastado: {formatCurrency(totalSpent)}</Text>
        </View>
      )}

      {budgets.map((budget) => {
        const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
        const isOver = percent > 100;
        return (
          <TouchableOpacity
            key={budget.id}
            style={s.budgetCard}
            onPress={() => openEdit(budget)}
            onLongPress={() => handleDelete(budget)}
            activeOpacity={0.7}
          >
            <View style={s.budgetHeader}>
              <View style={[s.budgetIcon, { backgroundColor: (budget.category_color || c.primary) + '18' }]}>
                <Ionicons name={(budget.category_icon || 'ellipsis-horizontal') as any} size={20} color={budget.category_color || c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.budgetName}>{budget.category_name}</Text>
                  {budget.is_recurring === 1 && (
                    <View style={s.recurringBadge}>
                      <Ionicons name="repeat" size={10} color={c.primary} />
                      <Text style={s.recurringBadgeText}>Fijo</Text>
                    </View>
                  )}
                </View>
                <Text style={s.budgetMeta}>
                  {formatCurrency(budget.spent)} de {formatCurrency(budget.amount)}
                </Text>
              </View>
              <Text style={[s.budgetPercent, isOver && { color: c.expense }]}>
                {percent.toFixed(0)}%
              </Text>
            </View>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: isOver ? c.expense : c.primary }]} />
            </View>
          </TouchableOpacity>
        );
      })}

      {budgets.length === 0 && (
        <View style={s.emptyState}>
          <View style={s.emptyRing}>
            <Ionicons name="wallet-outline" size={40} color={c.textLight} />
          </View>
          <Text style={s.emptyTitle}>Sin presupuestos</Text>
          <Text style={s.emptySub}>Agrega presupuestos para controlar tus gastos mensuales</Text>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</Text>

            <Text style={s.modalLabel}>Categoria</Text>
            <View style={s.catSearchWrap}>
              <Ionicons name="search" size={16} color={c.textLight} />
              <TextInput
                style={s.catSearchField}
                placeholder="Buscar categoria..."
                placeholderTextColor={c.textLight}
                value={catSearch}
                onChangeText={setCatSearch}
              />
              {catSearch ? (
                <TouchableOpacity onPress={() => setCatSearch('')}>
                  <Ionicons name="close-circle" size={16} color={c.textLight} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {availableCats.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catOption, selectedCategory?.id === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                  <Text style={s.catOptionLabel}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
              {availableCats.length === 0 && (
                <Text style={{ color: c.textLight, padding: 10, fontSize: 14 }}>Todas las categorias tienen presupuesto</Text>
              )}
            </ScrollView>

            <Text style={s.modalLabel}>Tipo</Text>
            <View style={s.typeToggle}>
              <TouchableOpacity
                style={[s.typeOption, isRecurring === 0 && s.typeOptionActive]}
                onPress={() => setIsRecurring(0)}
                activeOpacity={0.7}
              >
                <Ionicons name="flash-outline" size={16} color={isRecurring === 0 ? '#FFFFFF' : c.text} />
                <Text style={[s.typeOptionText, isRecurring === 0 && s.typeOptionTextActive]}>Variable</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeOption, isRecurring === 1 && s.typeOptionActive]}
                onPress={() => setIsRecurring(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="repeat" size={16} color={isRecurring === 1 ? '#FFFFFF' : c.text} />
                <Text style={[s.typeOptionText, isRecurring === 1 && s.typeOptionTextActive]}>Fijo</Text>
              </TouchableOpacity>
            </View>
            {isRecurring === 1 && (
              <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
                Los presupuestos fijos se crean automaticamente cada mes nuevo
              </Text>
            )}

            <Text style={s.modalLabel}>Monto Limite</Text>
            <View style={s.amountRow}>
              <Text style={s.currencySign}>$</Text>
              <TextInput
                style={s.amountField}
                placeholder="0.00"
                placeholderTextColor={c.textLight}
                keyboardType="decimal-pad"
                value={budgetAmount}
                onChangeText={setBudgetAmount}
              />
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.cancelBtn} activeOpacity={0.7}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={s.saveBtn} activeOpacity={0.85}>
                <Text style={s.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
