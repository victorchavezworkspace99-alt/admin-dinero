import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types';
import { Colors } from '../theme/colors';

interface Props {
  categories: Category[];
  selectedId: number | null;
  onSelect: (category: Category) => void;
  type: 'income' | 'expense';
}

export function CategorySelector({ categories, selectedId, onSelect, type }: Props) {
  const filtered = categories.filter(c => c.type === type);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      {filtered.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.item,
            selectedId === cat.id && { backgroundColor: cat.color + '15', borderColor: cat.color },
          ]}
          onPress={() => onSelect(cat)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: cat.color + '18' }]}>
            <Ionicons name={cat.icon as any} size={22} color={cat.color} />
          </View>
          <Text style={[styles.label, selectedId === cat.id && { color: cat.color, fontWeight: '700' }]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    paddingLeft: 20,
  },
  item: {
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
