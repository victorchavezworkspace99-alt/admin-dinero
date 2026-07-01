import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getAccounts, getCategories, createImportGroup, addTransaction, checkDuplicateTransaction } from '../database/database';
import { Account, Category } from '../types';
import { CURRENCIES, formatCurrency as fsFormatCurrency } from '../store/SettingsStore';

// CSV parsing offline utility
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' || char === '\r') {
        row.push(cell.trim());
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        cell = '';
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        cell += char;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }
  return lines;
}

// Robust Date Parsing
function cleanAndFormatDate(rawDate: string): string {
  const cleaned = rawDate.replace(/[^\d\/\-\:]/g, ' ').trim();
  const parts = cleaned.split(/[\/\-\s]/).filter(Boolean);
  if (parts.length < 3) return rawDate;

  let day = '', month = '', year = '';

  if (parts[0].length === 4) {
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else if (parts[2].length === 4) {
    day = parts[0];
    month = parts[1];
    year = parts[2];
  } else if (parts[2].length === 2) {
    day = parts[0];
    month = parts[1];
    year = '20' + parts[2];
  } else {
    return rawDate;
  }

  day = day.padStart(2, '0');
  month = month.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function CsvImportPreviewScreen({ route, navigation }: any) {
  const { colors: c, formatCurrency } = useTheme();
  const insets = useSafeAreaInsets();
  const { csvText, filename } = route.params;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Step navigation: 'map' | 'preview'
  const [step, setStep] = useState<'map' | 'preview'>('map');

  // Mapping states
  const [csvLines, setCsvLines] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dateCol, setDateCol] = useState(-1);
  const [descCol, setDescCol] = useState(-1);
  const [amountCol, setAmountCol] = useState(-1);

  // Preview & configuration states
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [rowAccounts, setRowAccounts] = useState<Record<number, number>>({});
  const [rowCategories, setRowCategories] = useState<Record<number, number>>({});
  
  // Date range filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Row selection modal picker states
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'account' | 'category'>('account');
  const [activeRowIdx, setActiveRowIdx] = useState(-1);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load accounts & categories
    Promise.all([getAccounts(), getCategories()]).then(([accs, cats]) => {
      setAccounts(accs);
      setCategories(cats);
    });

    // Parse CSV
    const parsed = parseCSV(csvText);
    setCsvLines(parsed);
    const hd = parsed[0] || [];
    setHeaders(hd);

    // Auto-detect columns
    let dIdx = -1, desIdx = -1, aIdx = -1;
    hd.forEach((h, idx) => {
      const name = h.toLowerCase();
      if (dIdx === -1 && (name.includes('fecha') || name.includes('date') || name.includes('day'))) dIdx = idx;
      if (desIdx === -1 && (name.includes('desc') || name.includes('concept') || name.includes('glosa') || name.includes('detalle'))) desIdx = idx;
      if (aIdx === -1 && (name.includes('monto') || name.includes('amount') || name.includes('valor') || name.includes('importe') || name.includes('cantidad'))) aIdx = idx;
    });

    setDateCol(dIdx !== -1 ? dIdx : 0);
    setDescCol(desIdx !== -1 ? desIdx : 1);
    setAmountCol(aIdx !== -1 ? aIdx : 2);
  }, [csvText]);

  // Handle column mapping submission
  const handleMapColumns = async () => {
    if (dateCol === -1 || descCol === -1 || amountCol === -1) {
      Alert.alert('Requerido', 'Mapea las columnas de Fecha, Descripción y Monto.');
      return;
    }

    const rows: any[] = [];
    const defaultAcc = accounts[0]?.id || 0;
    const defaultCat = categories[0]?.id || 0;

    const initialAccounts: Record<number, number> = {};
    const initialCategories: Record<number, number> = {};
    const initialSelected: Record<number, boolean> = {};

    // Process rows (skip header row 0)
    for (let i = 1; i < csvLines.length; i++) {
      const line = csvLines[i];
      if (line.length <= Math.max(dateCol, descCol, amountCol)) continue;

      const rawDate = line[dateCol];
      const desc = line[descCol];
      const rawAmount = line[amountCol];

      const cleanedDate = cleanAndFormatDate(rawDate);
      const parsedAmount = parseFloat(rawAmount.replace(/[^0-9\.\-]/g, ''));
      if (isNaN(parsedAmount)) continue;

      // Smart category guess based on description keywords
      let guessedCatId = defaultCat;
      const descLower = desc.toLowerCase();
      for (const cat of categories) {
        if (descLower.includes(cat.name.toLowerCase())) {
          guessedCatId = cat.id;
          break;
        }
      }

      // Check duplicates
      const isDup = await checkDuplicateTransaction(
        Math.abs(parsedAmount),
        cleanedDate,
        desc || 'Importación CSV',
        defaultAcc
      );

      rows.push({
        index: i,
        date: cleanedDate,
        description: desc || 'Importación CSV',
        amount: parsedAmount,
        isDuplicate: isDup
      });

      initialAccounts[i] = defaultAcc;
      initialCategories[i] = guessedCatId;
      initialSelected[i] = !isDup; // Auto-uncheck duplicates!
    }

    setPreviewRows(rows);
    setRowAccounts(initialAccounts);
    setRowCategories(initialCategories);
    setSelectedRows(initialSelected);
    setStep('preview');
  };

  // Filter rows based on date range
  const filteredRows = useMemo(() => {
    return previewRows.filter(row => {
      if (filterStartDate && row.date < filterStartDate) return false;
      if (filterEndDate && row.date > filterEndDate) return false;
      return true;
    });
  }, [previewRows, filterStartDate, filterEndDate]);

  const handleOpenPicker = (rowIdx: number, type: 'account' | 'category') => {
    setActiveRowIdx(rowIdx);
    setPickerType(type);
    setPickerVisible(true);
  };

  const handleSelectPickerItem = (id: number) => {
    if (pickerType === 'account') {
      setRowAccounts(prev => ({ ...prev, [activeRowIdx]: id }));
    } else {
      setRowCategories(prev => ({ ...prev, [activeRowIdx]: id }));
    }
    setPickerVisible(false);
  };

  const handleImport = async () => {
    const toImport = filteredRows.filter(r => selectedRows[r.index]);
    if (toImport.length === 0) {
      Alert.alert('Ninguna seleccionada', 'Selecciona al menos una transacción para importar.');
      return;
    }

    setSaving(true);
    try {
      // 1. Create import group
      const importGroupId = await createImportGroup(filename);

      // 2. Insert transactions
      for (const row of toImport) {
        const amt = Math.abs(row.amount);
        const type = row.amount >= 0 ? 'income' : 'expense';
        const catId = rowCategories[row.index];
        const accId = rowAccounts[row.index];

        await addTransaction(
          amt,
          type,
          catId,
          row.description,
          row.date,
          accId,
          undefined,
          importGroupId
        );
      }

      Alert.alert('Éxito', `Se han importado ${toImport.length} transacciones correctamente.`, [
        { text: 'Aceptar', onPress: () => navigation.pop(2) } // Go back to Backup & Import screen
      ]);
    } catch {
      Alert.alert('Error', 'No se pudieron guardar todas las transacciones.');
    }
    setSaving(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 }}>Vista Previa CSV</Text>
        <View style={{ width: 32 }} />
      </View>

      {step === 'map' ? (
        /* STEP 1: COLUMN MAPPING */
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 6 }}>Mapear Columnas</Text>
          <Text style={{ fontSize: 13, color: c.textSecondary, marginBottom: 20 }}>
            Configura qué columna de tu CSV corresponde a la fecha, descripción e importe.
          </Text>

          {/* Date Selector */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 8 }}>Columna de Fecha</Text>
          <View style={{ backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {headers.map((h, idx) => (
                <TouchableOpacity key={idx} style={{ paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4, borderRadius: 8, backgroundColor: dateCol === idx ? c.primary : 'transparent' }} onPress={() => setDateCol(idx)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: dateCol === idx ? '#FFFFFF' : c.textSecondary }}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Description Selector */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 8 }}>Columna de Descripción</Text>
          <View style={{ backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {headers.map((h, idx) => (
                <TouchableOpacity key={idx} style={{ paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4, borderRadius: 8, backgroundColor: descCol === idx ? c.primary : 'transparent' }} onPress={() => setDescCol(idx)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: descCol === idx ? '#FFFFFF' : c.textSecondary }}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Amount Selector */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 8 }}>Columna de Monto (Importe)</Text>
          <View style={{ backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 24, borderWidth: 1, borderColor: c.border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {headers.map((h, idx) => (
                <TouchableOpacity key={idx} style={{ paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4, borderRadius: 8, backgroundColor: amountCol === idx ? c.primary : 'transparent' }} onPress={() => setAmountCol(idx)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: amountCol === idx ? '#FFFFFF' : c.textSecondary }}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={{ backgroundColor: c.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }} onPress={handleMapColumns}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Mapear e Ir a Previsualización</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* STEP 2: PREVIEW & SELECTION */
        <View style={{ flex: 1 }}>
          {/* Filters Row */}
          <View style={{ flexDirection: 'row', padding: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.textLight }}>Desde (YYYY-MM-DD)</Text>
              <TextInput
                style={{ backgroundColor: c.background, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, fontSize: 13, color: c.text, marginTop: 4 }}
                placeholder="2026-01-01"
                placeholderTextColor={c.textLight}
                value={filterStartDate}
                onChangeText={setFilterStartDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.textLight }}>Hasta (YYYY-MM-DD)</Text>
              <TextInput
                style={{ backgroundColor: c.background, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, fontSize: 13, color: c.text, marginTop: 4 }}
                placeholder="2026-12-31"
                placeholderTextColor={c.textLight}
                value={filterEndDate}
                onChangeText={setFilterEndDate}
              />
            </View>
          </View>

          <FlatList
            data={filteredRows}
            keyExtractor={(item) => String(item.index)}
            contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isSelected = !!selectedRows[item.index];
              const isIncome = item.amount >= 0;
              const rowAccId = rowAccounts[item.index];
              const rowCatId = rowCategories[item.index];

              const acc = accounts.find(a => a.id === rowAccId);
              const cat = categories.find(ct => ct.id === rowCatId);

              const accCurrency = acc ? acc.currency_code : 'PEN';
              const currencyObj = CURRENCIES.find(cur => cur.code === accCurrency) || CURRENCIES.find(cur => cur.code === 'PEN')!;

              return (
                <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1, borderWidth: 1.5, borderColor: item.isDuplicate ? '#F59E0B60' : 'transparent' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }} onPress={() => setSelectedRows(prev => ({ ...prev, [item.index]: !prev[item.index] }))}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? c.primary : c.textLight}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: c.textLight }}>{item.date}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, marginTop: 2 }} numberOfLines={2}>{item.description}</Text>
                      </View>
                    </TouchableOpacity>

                    <Text style={{ fontSize: 15, fontWeight: '700', color: isIncome ? c.income : c.expense, letterSpacing: -0.3 }}>
                      {isIncome ? '+' : '-'}{fsFormatCurrency(Math.abs(item.amount), currencyObj)}
                    </Text>
                  </View>

                  {/* Warning label for duplicates */}
                  {item.isDuplicate && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10, gap: 4 }}>
                      <Ionicons name="warning" size={14} color="#F59E0B" />
                      <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '600' }}>Duplicado sugerido (ya registrado)</Text>
                    </View>
                  )}

                  {/* Selectors row */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.background, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, gap: 6 }} onPress={() => handleOpenPicker(item.index, 'account')}>
                      <Ionicons name={acc?.icon as any || 'wallet-outline'} size={14} color={acc?.color || c.textSecondary} />
                      <Text style={{ fontSize: 12, color: c.textSecondary, flex: 1 }} numberOfLines={1}>{acc?.name || 'Cuenta'}</Text>
                      <Ionicons name="chevron-down" size={12} color={c.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.background, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, gap: 6 }} onPress={() => handleOpenPicker(item.index, 'category')}>
                      <Ionicons name={cat?.icon as any || 'grid-outline'} size={14} color={cat?.color || c.textSecondary} />
                      <Text style={{ fontSize: 12, color: c.textSecondary, flex: 1 }} numberOfLines={1}>{cat?.name || 'Categoría'}</Text>
                      <Ionicons name="chevron-down" size={12} color={c.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={<View style={{ height: 60 }} />}
          />

          <View style={{ position: 'absolute', bottom: insets.bottom + 10, left: 16, right: 16 }}>
            <TouchableOpacity style={[{ backgroundColor: c.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }, saving && { opacity: 0.5 }]} onPress={handleImport} disabled={saving}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                {saving ? 'Importando...' : `Confirmar Importación (${filteredRows.filter(r => selectedRows[r.index]).length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Account / Category select picker */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setPickerVisible(false)} activeOpacity={1}>
          <View style={{ backgroundColor: c.surface, borderRadius: 20, width: '80%', maxHeight: '60%', padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 12 }}>
              Selecciona {pickerType === 'account' ? 'Cuenta' : 'Categoría'}
            </Text>
            {pickerType === 'account' ? (
              <FlatList
                data={accounts}
                keyExtractor={(a) => String(a.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }} onPress={() => handleSelectPickerItem(item.id)}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 14, color: c.text, fontWeight: '600' }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(ct) => String(ct.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }} onPress={() => handleSelectPickerItem(item.id)}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 14, color: c.text, fontWeight: '600' }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
