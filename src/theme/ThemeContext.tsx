import React, { createContext, useContext, useEffect, useState } from 'react';
import { Colors as LightColors } from './colors';
import { loadSettings, saveSettings, Settings, ThemeMode, formatCurrency } from '../store/SettingsStore';

const DarkColors = {
  primary: '#3B82F6',
  primaryLight: '#1E293B',
  primaryDark: '#60A5FA',
  income: '#22C55E',
  incomeLight: '#14532D',
  expense: '#EF4444',
  expenseLight: '#450A0A',
  background: '#0F0F12',
  surface: '#1C1C21',
  text: '#F1F1F6',
  textSecondary: '#9CA3AF',
  textLight: '#6B7280',
  border: '#2C2C33',
  cardShadow: 'rgba(0,0,0,0.3)',
  warning: '#F59E0B',
  warningLight: '#451A03',
  tabInactive: '#6B7280',
};

interface ThemeCtx {
  colors: typeof LightColors;
  settings: Settings;
  isDark: boolean;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

const ThemeContext = createContext<ThemeCtx>(null!);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const updateSettings = async (partial: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  };

  if (!settings) return null;

  const isDark = settings.theme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{
      colors,
      settings,
      isDark,
      updateSettings,
      formatCurrency: (amount: number) => formatCurrency(amount, settings.currency),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
