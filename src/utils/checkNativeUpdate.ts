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

export async function downloadAndInstallAPK(
  apkUrl: string,
  version: string,
  onProgress: (progress: number) => void
): Promise<void> {
  const { cacheDirectory, createDownloadResumable, StorageAccessFramework } = FileSystem;
  const localUri = `${cacheDirectory}BalancePro-${version}.apk`;

  const downloadResumable = createDownloadResumable(
    apkUrl,
    localUri,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      onProgress(Math.round(progress * 100));
    }
  );

  try {
    const downloadResult = await downloadResumable.downloadAsync();
    if (!downloadResult) throw new Error('Descarga vacia');
    const { uri } = downloadResult;

    if (Platform.OS === 'android') {
      const { readAsStringAsync } = FileSystem;
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });

      let downloadsUri = await AsyncStorage.getItem('@backup_saf_uri');
      if (!downloadsUri) {
        // Request folder permissions
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          downloadsUri = permissions.directoryUri;
          await AsyncStorage.setItem('@backup_saf_uri', downloadsUri);
        }
      }

      if (downloadsUri) {
        const safeUri = await StorageAccessFramework.createFileAsync(
          downloadsUri,
          `BalancePro-${version}.apk`,
          'application/vnd.android.package-archive'
        );
        await StorageAccessFramework.writeAsStringAsync(safeUri, base64, { encoding: 'base64' });
        await Linking.openURL(safeUri);
      } else {
        throw new Error('Permisos SAF denegados');
      }
    } else {
      await Linking.openURL(apkUrl);
    }
  } catch (error: any) {
    Alert.alert('Error de instalacion', error?.message || 'No se pudo completar la instalacion.');
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
