import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase, checkAndAutoCopyRecurringBudgets } from './src/database/database';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { loadSettings } from './src/store/SettingsStore';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { isDark, settings } = useTheme();
  const [showWelcome, setShowWelcome] = useState(!settings.userName);

  if (showWelcome) {
    return (
      <>
        <StatusBar style="dark" />
        <WelcomeScreen onComplete={() => {
          setShowWelcome(false);
        }} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startApp = () => {
    setError(null);
    setReady(false);
    loadSettings().then(() => initDatabase())
      .then(() => checkAndAutoCopyRecurringBudgets())
      .then(() => {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      })
      .catch((err) => {
        setError(err.message || 'Error al inicializar');
        SplashScreen.hideAsync().catch(() => {});
      });
  };

  useEffect(() => { startApp(); }, []);

  const handleRecovery = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      startApp();
    }
  };

  const handleResetDB = () => {
    Alert.alert(
      'Reiniciar datos',
      'Se borraran todas las transacciones, cuentas y presupuestos. Las categorias por defecto se restauraran.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar', style: 'destructive', onPress: async () => {
            try {
              const { deleteDatabaseAsync } = await import('expo-sqlite');
              await deleteDatabaseAsync('finanzas.db');
            } catch {}
            startApp();
          },
        },
      ]
    );
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Error al iniciar</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={startApp} activeOpacity={0.8}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recoveryBtn} onPress={handleRecovery} activeOpacity={0.8}>
          <Text style={styles.recoveryText}>Recuperar version anterior</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetDB} activeOpacity={0.8}>
          <Text style={styles.resetText}>Reiniciar datos de fabrica</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
    paddingHorizontal: 24,
  },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 8, letterSpacing: -0.4 },
  errorText: {
    fontSize: 14,
    color: '#6C6E76',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#1A6DF0', paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, width: '100%', alignItems: 'center', marginBottom: 10,
  },
  retryText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  recoveryBtn: {
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#8B5CF6',
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  recoveryText: { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },
  resetBtn: {
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E04848',
    width: '100%', alignItems: 'center',
  },
  resetText: { fontSize: 14, fontWeight: '600', color: '#E04848' },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A6DF0',
  },
  splashIcon: {
    width: 100,
    height: 100,
    borderRadius: 22,
  },
  splashTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});