import { File, Directory, Paths } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { Linking, Alert, Platform } from 'react-native';

const UPDATE_INFO_URL = 'https://raw.githubusercontent.com/victorchavezworkspace99-alt/admin-dinero/main/version.json';

interface UpdateInfo {
  latestVersion: string;
  apkUrl: string;
  changelog: string;
}

export async function checkNativeUpdate(): Promise<UpdateInfo | null> {
  try {
    const resp = await fetch(UPDATE_INFO_URL, { cache: 'no-cache' });
    const data: UpdateInfo = await resp.json();
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    if (compareVersions(data.latestVersion, currentVersion) > 0) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function downloadAndInstallAPK(apkUrl: string, version: string): Promise<void> {
  const result = await File.downloadFileAsync(apkUrl, new Directory(Paths.cache), { idempotent: true });
  const filePath = result.uri;

  if (Platform.OS === 'android') {
    try {
      const bytes = await result.bytes();
      const base64 = arrayBufferToBase64(bytes);
      const safeUri = await StorageAccessFramework.createFileAsync(
        StorageAccessFramework.getUriForDirectoryInRoot('Downloads'),
        `BalancePro-${version}`,
        'application/vnd.android.package-archive'
      );
      await StorageAccessFramework.writeAsStringAsync(safeUri, base64);
      await Linking.openURL(safeUri);
    } catch {
      Alert.alert(
        'APK Descargado',
        'Revisa la carpeta de Descargas para instalar la actualizacion.'
      );
    }
  } else {
    Linking.openURL(apkUrl);
  }
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}
