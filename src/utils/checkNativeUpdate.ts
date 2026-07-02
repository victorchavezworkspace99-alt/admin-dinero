import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const resp = await fetch(`${UPDATE_INFO_URL}?t=${Date.now()}`, { cache: 'no-cache' });
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

export async function downloadAndInstallAPK(
  apkUrl: string,
  version: string,
  onProgress: (progress: number, bytesWritten: number, totalBytes: number) => void
): Promise<void> {
  const { cacheDirectory, createDownloadResumable } = FileSystem;
  const localUri = `${cacheDirectory}BalancePro-${version}.apk`;

  const downloadResumable = createDownloadResumable(
    apkUrl,
    localUri,
    {},
    (downloadProgress) => {
      const total = downloadProgress.totalBytesExpectedToWrite;
      const written = downloadProgress.totalBytesWritten;
      const progress = total > 0 ? Math.round((written / total) * 100) : -1;
      onProgress(progress, written, total);
    }
  );

  try {
    const downloadResult = await downloadResumable.downloadAsync();
    if (!downloadResult) throw new Error('Descarga vacía');
    const { uri } = downloadResult;

    if (Platform.OS === 'android') {
      try {
        const IntentLauncher = await import('expo-intent-launcher');
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          type: 'application/vnd.android.package-archive',
          flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
        });
      } catch (intentError) {
        console.log('IntentLauncher not available, falling back to Sharing:', intentError);
        const Sharing = await import('expo-sharing');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/vnd.android.package-archive',
            dialogTitle: 'Instalar actualización',
          });
        } else {
          throw new Error('El sistema de compartir no está disponible.');
        }
      }
    } else {
      await Linking.openURL(apkUrl);
    }
  } catch (error: any) {
    Alert.alert('Error de instalación', error?.message || 'No se pudo completar la instalación.');
  }
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
