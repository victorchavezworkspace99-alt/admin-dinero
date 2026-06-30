import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    deps: {
      inline: ['react-native', '@react-navigation', 'expo', 'react-native-reanimated', 'react-native-gesture-handler', 'react-native-screens', 'react-native-safe-area-context', '@react-native-async-storage/async-storage', 'expo-sqlite', 'expo-file-system', 'expo-sharing'],
    },
    server: {
      deps: {
        fallbackCJS: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
