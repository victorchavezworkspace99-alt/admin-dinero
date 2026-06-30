import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getBudgets, setBudget, deleteBudget, getCategories } from '../database/database';
import { Budget, Category } from '../types';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function BudgetsScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');

  useFocusEffect(useCallback(() => {
    getBudgets(month, year).then(setBudgets);
    getCategories('expense').then(setCategories);
  }, [month, year]));

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
    setSelectedCategory(null);
    setBudgetAmount('');
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
      await setBudget(selectedCategory.id, parseFloat(budgetAmount), month, year);
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

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const uncategorizedCats = categories.filter(c => !budgets.some(b => b.category_id === c.id));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Presupuestos</Text>
        <TouchableOpacity onPress={openAdd}>
          <Ionicons name="add-circle" size={28} color={Colors.surface} />
        </TouchableOpacity>
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

      {budgets.length > 0 && (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Presupuesto Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalBudget)}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`, backgroundColor: (totalSpent / totalBudget) > 0.8 ? Colors.warning : Colors.primary }]} />
          </View>
          <Text style={styles.totalSpent}>Gastado: {formatCurrency(totalSpent)}</Text>
        </View>
      )}

      {budgets.map((budget) => {
        const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
        const isOver = percent > 100;
        return (
          <TouchableOpacity
            key={budget.id}
            style={styles.budgetCard}
            onLongPress={() => handleDelete(budget)}
            activeOpacity={0.7}
          >
            <View style={styles.budgetHeader}>
              <View style={[styles.budgetIcon, { backgroundColor: (budget.category_color || Colors.primary) + '18' }]}>
                <Ionicons name={(budget.category_icon || 'ellipsis-horizontal') as any} size={20} color={budget.category_color || Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.budgetName}>{budget.category_name}</Text>
                <Text style={styles.budgetMeta}>
                  {formatCurrency(budget.spent)} de {formatCurrency(budget.amount)}
                </Text>
              </View>
              <Text style={[styles.budgetPercent, isOver && { color: Colors.expense }]}>
                {percent.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(percent, 100)}%`,
                    backgroundColor: isOver ? Colors.expense : Colors.primary,
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        );
      })}

      {budgets.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyRing}>
            <Ionicons name="wallet-outline" size={40} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Sin presupuestos</Text>
          <Text style={styles.emptySub}>Agrega presupuestos para controlar tus gastos mensuales</Text>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Presupuesto</Text>

            <Text style={styles.modalLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {uncategorizedCats.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catOption,
                    selectedCategory?.id === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                  <Text style={styles.catOptionLabel}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
              {uncategorizedCats.length === 0 && (
                <Text style={{ color: Colors.textLight, padding: 10, fontSize: 14 }}>Todas las categorias tienen presupuesto</Text>
              )}
            </ScrollView>

            <Text style={styles.modalLabel}>Monto Limite</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySign}>$</Text>
              <TextInput
                style={styles.amountField}
                placeholder="0.00"
                placeholderTextColor={Colors.textLight}
                keyboardType="decimal-pad"
                value={budgetAmount}
                onChangeText={setBudgetAmount}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.85}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  totalCard: { backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20, shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  totalLabel: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  totalAmount: { fontSize: 28, fontWeight: '800', color: Colors.text, textAlign: 'center', marginTop: 4, letterSpacing: -1 },
  totalSpent: { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginTop: 6, fontWeight: '500' },
  budgetCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  budgetIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  budgetName: { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 },
  budgetMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  budgetPercent: { fontSize: 16, fontWeight: '800', color: Colors.primary, letterSpacing: -0.3 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginTop: 16, letterSpacing: -0.3 },
  emptySub: { fontSize: 14, color: Colors.textLight, marginTop: 6, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,28,30,0.4)' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 16, letterSpacing: -0.4 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  catOption: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
  },
  catOptionLabel: { fontSize: 12, color: Colors.text, marginTop: 4, fontWeight: '500' },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 },
  currencySign: { fontSize: 20, fontWeight: '600', color: Colors.textSecondary, marginRight: 4 },
  amountField: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.text, paddingVertical: 14, letterSpacing: -0.5 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.background },
  cancelText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.primary },
  saveText: { fontSize: 16, fontWeight: '600', color: Colors.surface },
});
