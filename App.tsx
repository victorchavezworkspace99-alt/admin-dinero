import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Image, TouchableOpacity, Alert, Modal } from 'react-native';
import * as Updates from 'expo-updates';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase, checkAndAutoCopyRecurringBudgets } from './src/database/database';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { loadSettings } from './src/store/SettingsStore';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { isDark, settings } = useTheme();
  const [showWelcome, setShowWelcome] = useState(!settings.userName);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const triggerAutoUpdateCheck = async () => {
    try {
      const lastCheckStr = await AsyncStorage.getItem('@last_update_check_time');
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours

      if (lastCheckStr) {
        const lastCheck = parseInt(lastCheckStr, 10);
        if (now - lastCheck < ONE_DAY_MS) {
          return;
        }
      }

      await AsyncStorage.setItem('@last_update_check_time', String(now));

      // 1. Check for OTA Updates
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          Alert.alert(
            'Actualización rápida disponible',
            'Hemos preparado mejoras de diseño y correcciones rápidas. ¿Deseas aplicarlas ahora? La aplicación se reiniciará.',
            [
              {
                text: 'Aplicar ahora',
                onPress: async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch {
                    Alert.alert('Error', 'No se pudo aplicar la actualización.');
                  }
                }
              },
              { text: 'Recordar después', style: 'cancel' }
            ]
          );
          return;
        }
      } catch (e) {
        // Ignore background failures
      }

      // 2. Check for Native Updates (APKs)
      try {
        const { checkNativeUpdate } = await import('./src/utils/checkNativeUpdate');
        const nativeUpdate = await checkNativeUpdate();
        if (nativeUpdate) {
          Alert.alert(
            'Nueva versión disponible',
            `Balance Pro v${nativeUpdate.latestVersion}\n\n${nativeUpdate.changelog}\n\n¿Deseas descargar e instalar esta actualización nativa ahora?`,
            [
              {
                text: 'Actualizar ahora',
                onPress: async () => {
                  setIsDownloading(true);
                  setProgress(0);
                  try {
                    const { downloadAndInstallAPK } = await import('./src/utils/checkNativeUpdate');
                    await downloadAndInstallAPK(nativeUpdate.apkUrl, nativeUpdate.latestVersion, (p) => {
                      setProgress(p);
                    });
                  } catch (err: any) {
                    Alert.alert('Error de descarga', err?.message || 'No se pudo descargar el APK.');
                  } finally {
                    setIsDownloading(false);
                  }
                }
              },
              { text: 'Recordar después', style: 'cancel' }
            ]
          );
        }
      } catch (e) {
        // Ignore background failures
      }
    } catch (e) {
      // Ignore errors
    }
  };

  useEffect(() => {
    if (!showWelcome) {
      triggerAutoUpdateCheck();
    }
  }, [showWelcome]);

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
    <>
      <NavigationContainer>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AppNavigator />
      </NavigationContainer>

      <Modal visible={isDownloading} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderRadius: 24, padding: 32, width: '80%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10 }}>
            <ActivityIndicator size="large" color="#1A6DF0" style={{ marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827', marginBottom: 8 }}>
              Descargando actualización
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center', marginBottom: 24 }}>
              Esto puede tomar unos segundos...
            </Text>
            <View style={{ width: '100%', height: 8, backgroundColor: isDark ? '#374151' : '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#1A6DF0', borderRadius: 4 }} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A6DF0' }}>
              {progress}%
            </Text>
          </View>
        </View>
      </Modal>
    </>
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