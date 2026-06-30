import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CategoryColors } from '../theme/colors';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../database/database';
import { Category } from '../types';

const ICONS = ['briefcase', 'laptop', 'trending-up', 'cart', 'cash', 'fast-food', 'car', 'home', 'flash', 'medkit', 'book', 'game-controller', 'shirt', 'repeat', 'restaurant', 'ellipsis-horizontal', 'gift', 'airplane', 'fitness', 'water', 'paw', 'wine', 'camera', 'musical-notes'];

export function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(CategoryColors[0]);
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');

  useFocusEffect(useCallback(() => {
    getCategories().then(setCategories);
  }, []));

  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const incomeCats = filtered.filter(c => c.type === 'income');
  const expenseCats = filtered.filter(c => c.type === 'expense');

  const openAdd = (type: 'income' | 'expense') => {
    setEditItem(null);
    setName('');
    setSelectedIcon(ICONS[0]);
    setSelectedColor(CategoryColors[0]);
    setCatType(type);
    setModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditItem(cat);
    setName(cat.name);
    setSelectedIcon(cat.icon);
    setSelectedColor(cat.color);
    setCatType(cat.type);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nombre Requerido', 'Ingresa un nombre para la categoria');
      return;
    }
    try {
      if (editItem) {
        await updateCategory(editItem.id, name.trim(), selectedIcon, selectedColor);
      } else {
        await addCategory(name.trim(), catType, selectedIcon, selectedColor);
      }
      setModalVisible(false);
      getCategories().then(setCategories);
    } catch {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const handleDelete = (cat: Category) => {
    if (cat.is_default) {
      Alert.alert('No se puede eliminar', 'Las categorias por defecto no pueden eliminarse');
      return;
    }
    Alert.alert('Eliminar Categoria', `Eliminar "${cat.name}"? Las transacciones asociadas tambien se eliminaran.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        deleteCategory(cat.id).then(() => getCategories().then(setCategories));
      }},
    ]);
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.catItem}
      onPress={() => openEdit(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.catIcon, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon as any} size={20} color={item.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.catName}>{item.name}</Text>
        <Text style={styles.catType}>{item.type === 'income' ? 'Ingreso' : 'Gasto'}</Text>
      </View>
      <Ionicons name="pencil" size={16} color={Colors.textLight} />
    </TouchableOpacity>
  );

  const sections = [
    { type: 'income' as const, label: 'Ingresos', data: incomeCats },
    { type: 'expense' as const, label: 'Gastos', data: expenseCats },
  ].filter(s => !search || s.data.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categorias</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar categoria..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.type}
        renderItem={({ item }) => (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.label}</Text>
              <TouchableOpacity onPress={() => openAdd(item.type)} style={styles.addBtn} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={Colors.primary} />
                <Text style={styles.addText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            {item.data.map((cat) => (
              <View key={cat.id}>{renderCategory({ item: cat })}</View>
            ))}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editItem ? 'Editar' : 'Nueva'} Categoria</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre"
              placeholderTextColor={Colors.textLight}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.modalLabel}>Icono</Text>
            <FlatList
              data={ICONS}
              numColumns={6}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.iconOption, selectedIcon === item && { backgroundColor: selectedColor + '25', borderColor: selectedColor }]}
                  onPress={() => setSelectedIcon(item)}
                >
                  <Ionicons name={item as any} size={20} color={selectedIcon === item ? selectedColor : Colors.textSecondary} />
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorRow}>
              {CategoryColors.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveModalBtn} activeOpacity={0.85}>
                <Text style={styles.saveModalText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: 16, marginTop: 12, borderRadius: 12,
    paddingHorizontal: 12, height: 40, gap: 6,
    shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 0 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 3,
    borderRadius: 14,
    padding: 14,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catName: { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 },
  catType: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28,28,30,0.4)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 16, letterSpacing: -0.4 },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
  },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.text },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.background },
  cancelText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  saveModalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.primary },
  saveModalText: { fontSize: 16, fontWeight: '600', color: Colors.surface },
});