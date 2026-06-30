import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
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
  const filtered = categories.filter(c => c.type === type);

  return (
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
  );
}

const styles = StyleSheet.create({
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
