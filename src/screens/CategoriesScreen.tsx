import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { CategoryColors } from '../theme/colors';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../database/database';
import { Category } from '../types';

const ICONS = ['briefcase', 'laptop', 'trending-up', 'cart', 'cash', 'fast-food', 'car', 'home', 'flash', 'medkit', 'book', 'game-controller', 'shirt', 'repeat', 'restaurant', 'ellipsis-horizontal', 'gift', 'airplane', 'fitness', 'water', 'paw', 'wine', 'camera', 'musical-notes'];

export function CategoriesScreen() {
  const { colors: c } = useTheme();
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
    return categories.filter(cat => cat.name.toLowerCase().includes(q));
  }, [categories, search]);

  const incomeCats = filtered.filter(cat => cat.type === 'income');
  const expenseCats = filtered.filter(cat => cat.type === 'expense');

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

  const renderCategory = (item: Category) => (
    <TouchableOpacity
      key={item.id}
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, marginHorizontal: 16, marginVertical: 3, borderRadius: 14, padding: 14, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1 }}
      onPress={() => openEdit(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: item.color + '18' }}>
        <Ionicons name={item.icon as any} size={20} color={item.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, letterSpacing: -0.2 }}>{item.name}</Text>
        <Text style={{ fontSize: 12, color: c.textLight, marginTop: 2 }}>{item.type === 'income' ? 'Ingreso' : 'Gasto'}</Text>
      </View>
      <Ionicons name="pencil" size={16} color={c.textLight} />
    </TouchableOpacity>
  );

  const sections = [
    { type: 'income' as const, label: 'Ingresos', data: incomeCats },
    { type: 'expense' as const, label: 'Gastos', data: expenseCats },
  ].filter(s => !search || s.data.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ backgroundColor: c.primary, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>Categorias</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 6, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1 }}>
        <Ionicons name="search" size={16} color={c.textLight} />
        <TextInput
          style={{ flex: 1, fontSize: 14, color: c.text, paddingVertical: 0 }}
          placeholder="Buscar categoria..."
          placeholderTextColor={c.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={c.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.type}
        renderItem={({ item }) => (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}>{item.label}</Text>
              <TouchableOpacity onPress={() => openAdd(item.type)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={c.primary} />
                <Text style={{ fontSize: 14, color: c.primary, fontWeight: '600' }}>Agregar</Text>
              </TouchableOpacity>
            </View>
            {item.data.map((cat) => renderCategory(cat))}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,28,30,0.4)' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 16, letterSpacing: -0.4 }}>{editItem ? 'Editar' : 'Nueva'} Categoria</Text>

            <TextInput
              style={{ backgroundColor: c.background, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 16 }}
              placeholder="Nombre"
              placeholderTextColor={c.textLight}
              value={name}
              onChangeText={setName}
            />

            <Text style={{ fontSize: 14, fontWeight: '600', color: c.textSecondary, marginBottom: 8 }}>Icono</Text>
            <FlatList
              data={ICONS}
              numColumns={6}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 2, borderColor: selectedIcon === item ? selectedColor : 'transparent', backgroundColor: selectedIcon === item ? selectedColor + '25' : 'transparent' }}
                  onPress={() => setSelectedIcon(item)}
                >
                  <Ionicons name={item as any} size={20} color={selectedIcon === item ? selectedColor : c.textSecondary} />
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />

            <Text style={{ fontSize: 14, fontWeight: '600', color: c.textSecondary, marginBottom: 8 }}>Color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {CategoryColors.map((col) => (
                <TouchableOpacity
                  key={col}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: col, borderWidth: selectedColor === col ? 3 : 0, borderColor: c.text }}
                  onPress={() => setSelectedColor(col)}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.background }} activeOpacity={0.7}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: c.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.primary }} activeOpacity={0.85}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}