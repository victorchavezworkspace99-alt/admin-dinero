import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { initDatabase } from './src/database/database';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { loadSettings } from './src/store/SettingsStore';
import { WelcomeScreen } from './src/screens/WelcomeScreen';

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

  useEffect(() => {
    loadSettings().then(() => initDatabase())
      .then(() => setReady(true))
      .catch((err) => setError(err.message || 'Error al inicializar'));
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.splashContainer}>
        <Image source={require('./assets/iconoapp.png')} style={styles.splashIcon} resizeMode="contain" />
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 24 }} />
        <Text style={styles.splashTitle}>Balance Pro</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C6E76',
  },
  errorText: {
    fontSize: 16,
    color: '#E04848',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
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
