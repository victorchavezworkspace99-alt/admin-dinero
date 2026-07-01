import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, TextInput } from 'react-native';
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

  const sorted = useMemo(() => {
    const parentCats = categories.filter(cat => cat.type === type && !cat.parent_id);
    const result: Category[] = [];
    for (const parent of parentCats) {
      result.push(parent);
      const children = categories.filter(cat => cat.type === type && cat.parent_id === parent.id);
      result.push(...children);
    }
    const orphans = categories.filter(cat => cat.type === type && cat.parent_id && !parentCats.some(p => p.id === cat.parent_id));
    result.push(...orphans);
    return result;
  }, [categories, type]);

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(cat => cat.name.toLowerCase().includes(q));
  }, [sorted, search]);

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
        {filtered.map((cat) => {
          const isSelected = selectedId === cat.id;
          const displayName = cat.parent_id ? `↳ ${cat.name}` : cat.name;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[{ alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1.5, marginBottom: 4, width: ITEM_WIDTH, borderColor: isSelected ? cat.color : c.border }, isSelected && { backgroundColor: cat.color + '12' }]}
              onPress={() => onSelect(cat)}
              activeOpacity={0.7}
            >
              <View style={{ width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: cat.color + '18' }}>
                <Ionicons name={cat.icon as any} size={24} color={cat.color} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', textAlign: 'center', letterSpacing: -0.2, color: isSelected ? cat.color : c.text }} numberOfLines={1}>
                {displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}