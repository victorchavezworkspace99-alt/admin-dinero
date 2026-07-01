import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'wallet-outline', title, subtitle }: Props) {
  const { colors: c } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 60 }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: c.border }}>
        <Ionicons name={icon as any} size={48} color={c.textLight} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '600', color: c.textSecondary, marginTop: 20, textAlign: 'center', letterSpacing: -0.3 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 14, color: c.textLight, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>{subtitle}</Text>}
    </View>
  );
}
