import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, TextInput, Modal, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types';
import { useTheme } from '../theme/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 8;
const GRID_PADDING = 16;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

interface Props {
  categories: Category[];
  selectedId: number | null;
  onSelect: (category: Category) => void;
  type: 'income' | 'expense';
}

export function CategorySelector({ categories, selectedId, onSelect, type }: Props) {
  const { colors: c } = useTheme();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  // Get only parent categories (categories without a parent_id)
  const parentCategories = useMemo(() => {
    return categories.filter(cat => cat.type === type && !cat.parent_id);
  }, [categories, type]);

  // Count subcategories for each parent
  const subcategoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const cat of categories) {
      if (cat.type === type && cat.parent_id) {
        counts[cat.parent_id] = (counts[cat.parent_id] || 0) + 1;
      }
    }
    return counts;
  }, [categories, type]);

  // Find subcategories of the active parent category
  const activeSubcategories = useMemo(() => {
    if (!activeCategory) return [];
    return categories.filter(cat => cat.type === type && cat.parent_id === activeCategory.id);
  }, [categories, activeCategory, type]);

  // Filter parent categories by search term
  const filteredParents = useMemo(() => {
    if (!search) return parentCategories;
    const q = search.toLowerCase();
    return parentCategories.filter(cat => cat.name.toLowerCase().includes(q));
  }, [parentCategories, search]);

  const handlePressCategory = (cat: Category) => {
    const subCount = subcategoryCounts[cat.id] || 0;
    if (subCount > 0) {
      setActiveCategory(cat);
    } else {
      onSelect(cat);
    }
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, marginHorizontal: GRID_PADDING, marginBottom: 10, borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 6, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1 }}>
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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_PADDING, gap: GRID_GAP }}>
        {filteredParents.map((cat) => {
          const subCount = subcategoryCounts[cat.id] || 0;
          // Check if selected category is either this parent or any of its children
          const isSelected = selectedId === cat.id || 
            categories.some(child => child.id === selectedId && child.parent_id === cat.id);

          return (
            <TouchableOpacity
              key={cat.id}
              style={[{ alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1.5, marginBottom: 4, width: ITEM_WIDTH, borderColor: isSelected ? cat.color : c.border }, isSelected && { backgroundColor: cat.color + '12' }]}
              onPress={() => handlePressCategory(cat)}
              activeOpacity={0.7}
            >
              <View style={{ width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: cat.color + '18' }}>
                <Ionicons name={cat.icon as any} size={24} color={cat.color} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', textAlign: 'center', letterSpacing: -0.2, color: isSelected ? cat.color : c.text }} numberOfLines={1}>
                {cat.name}
              </Text>

              {/* Subcategories Count Badge in bottom right */}
              {subCount > 0 && (
                <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: cat.color, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{subCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contextual Subcategories Picker Modal */}
      {activeCategory && (
        <Modal visible={activeCategory !== null} transparent animationType="fade">
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} 
            onPress={() => setActiveCategory(null)}
            activeOpacity={1}
          >
            <View style={{ backgroundColor: c.surface, borderRadius: 24, width: '85%', maxHeight: '60%', padding: 24, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: activeCategory.color + '18', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={activeCategory.icon as any} size={18} color={activeCategory.color} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: c.text, flex: 1 }}>{activeCategory.name}</Text>
                <TouchableOpacity onPress={() => setActiveCategory(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={c.textLight} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: c.textSecondary, marginBottom: 12 }}>Selecciona una subcategoría:</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Option to select the main category itself */}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 }}
                  onPress={() => { onSelect(activeCategory); setActiveCategory(null); }}
                >
                  <Ionicons name="radio-button-on-outline" size={16} color={activeCategory.color} />
                  <Text style={{ fontSize: 14, color: c.text, fontWeight: '700' }}>Solo {activeCategory.name} (General)</Text>
                </TouchableOpacity>

                {activeSubcategories.map((sub) => {
                  const isSubSelected = selectedId === sub.id;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 }}
                      onPress={() => { onSelect(sub); setActiveCategory(null); }}
                    >
                      <Ionicons name="chevron-forward" size={16} color={sub.color} />
                      <Text style={{ fontSize: 14, color: isSubSelected ? sub.color : c.text, fontWeight: isSubSelected ? '700' : '500' }}>{sub.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}