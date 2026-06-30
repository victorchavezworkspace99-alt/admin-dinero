import { vi } from 'vitest';

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(() => Promise.resolve({
    execAsync: vi.fn(),
    runAsync: vi.fn(),
    getAllAsync: vi.fn(() => Promise.resolve([])),
  })),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  setItem: vi.fn(() => Promise.resolve()),
  getItem: vi.fn(() => Promise.resolve(null)),
  removeItem: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
}));

vi.mock('expo-file-system', () => ({
  documentDirectory: '/mock/document/dir',
  cacheDirectory: '/mock/cache/dir',
  writeAsStringAsync: vi.fn(() => Promise.resolve()),
  readAsStringAsync: vi.fn(() => Promise.resolve('')),
}));

vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(() => Promise.resolve()),
  isAvailableAsync: vi.fn(() => Promise.resolve(true)),
}));
