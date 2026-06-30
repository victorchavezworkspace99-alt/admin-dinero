import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types';
import { Colors } from '../theme/colors';

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
  const [search, setSearch] = useState('');
  const filtered = categories.filter(c => c.type === type && c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View>
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
      <View style={styles.grid}>
        {filtered.map((cat) => {
          const isSelected = selectedId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.item,
                { width: ITEM_WIDTH, borderColor: isSelected ? cat.color : Colors.border },
                isSelected && { backgroundColor: cat.color + '12' },
              ]}
              onPress={() => onSelect(cat)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: cat.color + '18' }]}>
                <Ionicons name={cat.icon as any} size={24} color={cat.color} />
              </View>
              <Text style={[styles.label, { color: isSelected ? cat.color : Colors.text }]} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: GRID_PADDING, marginBottom: 10, borderRadius: 12,
    paddingHorizontal: 12, height: 40, gap: 6,
    shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 0 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  item: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});