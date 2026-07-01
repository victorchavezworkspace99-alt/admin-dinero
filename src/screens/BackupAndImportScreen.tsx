import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  exportDatabase,
  importDatabase,
  getImportGroups,
  deleteImportGroup
} from '../database/database';

export function BackupAndImportScreen({ navigation }: any) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [importGroups, setImportGroups] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const groups = await getImportGroups();
      setImportGroups(groups);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleExportBackup = async () => {
    setProcessing(true);
    try {
      const path = await exportDatabase();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { dialogTitle: 'Guardar copia de seguridad' });
      } else {
        Alert.alert('No compatible', 'El envío de archivos no está disponible en este dispositivo.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo exportar la copia de seguridad.');
    }
    setProcessing(false);
  };

  const handleImportBackup = async () => {
    Alert.alert(
      'Restaurar copia de seguridad',
      '¡Atención! Restaurar una base de datos reemplazará todos tus datos actuales de forma permanente. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restaurar', style: 'destructive', onPress: async () => {
          setProcessing(true);
          try {
            const pickerResult = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
            if (pickerResult.assets && pickerResult.assets[0]) {
              const fileUri = pickerResult.assets[0].uri;
              await importDatabase(fileUri);
              Alert.alert('Restaurado', 'Copia de seguridad restaurada correctamente. Reinicia la aplicación para aplicar los cambios.');
              loadData();
            }
          } catch (e: any) {
            Alert.alert('Error', 'No se pudo restaurar el archivo. Asegúrate de seleccionar un archivo .db válido.');
          }
          setProcessing(false);
        }}
      ]
    );
  };

  const handleImportCSV = async () => {
    setProcessing(true);
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
      if (pickerResult.assets && pickerResult.assets[0]) {
        const file = pickerResult.assets[0];
        const content = await FileSystem.readAsStringAsync(file.uri);
        navigation.navigate('CsvImportPreview', { csvText: content, filename: file.name });
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo leer el archivo CSV.');
    }
    setProcessing(false);
  };

  const handleDeleteGroup = (group: any) => {
    Alert.alert(
      'Revertir Importación',
      `¿Deseas eliminar permanentemente esta importación y revertir sus ${group.count} transacciones creadas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revertir', style: 'destructive', onPress: async () => {
          setProcessing(true);
          try {
            await deleteImportGroup(group.id);
            loadData();
            Alert.alert('Exito', 'Importación revertida y transacciones eliminadas.');
          } catch {
            Alert.alert('Error', 'No se pudo revertir la importación.');
          }
          setProcessing(false);
        }}
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 }}>Copia de Seguridad e Importación</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Backup actions */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 12, letterSpacing: -0.3 }}>Base de Datos (Backups)</Text>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, gap: 10, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2, marginBottom: 24 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.background, padding: 14, borderRadius: 12, gap: 12 }} onPress={handleExportBackup} disabled={processing}>
            <Ionicons name="cloud-upload-outline" size={22} color={c.primary} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, flex: 1 }}>Exportar Copia (.db)</Text>
            <Ionicons name="chevron-forward" size={16} color={c.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.background, padding: 14, borderRadius: 12, gap: 12 }} onPress={handleImportBackup} disabled={processing}>
            <Ionicons name="cloud-download-outline" size={22} color={c.expense} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, flex: 1 }}>Restaurar Copia (.db)</Text>
            <Ionicons name="chevron-forward" size={16} color={c.textLight} />
          </TouchableOpacity>
        </View>

        {/* CSV Import action */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 12, letterSpacing: -0.3 }}>Importación Inteligente</Text>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2, marginBottom: 24 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary + '12', padding: 16, borderRadius: 12, gap: 12 }} onPress={handleImportCSV} disabled={processing}>
            <Ionicons name="document-text-outline" size={24} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.primary }}>Importar Extracto (CSV)</Text>
              <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>Selecciona un archivo CSV de tu banco para importar transacciones de forma inteligente.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.primary} />
          </TouchableOpacity>
        </View>

        {/* Import History */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 12, letterSpacing: -0.3 }}>Historial de Importaciones CSV</Text>
        {importGroups.length === 0 ? (
          <View style={{ alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, padding: 32, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }}>
            <Ionicons name="receipt-outline" size={40} color={c.textLight} />
            <Text style={{ fontSize: 14, color: c.textLight, marginTop: 10 }}>No has importado ningún archivo CSV aún.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {importGroups.map(group => (
              <View key={group.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, padding: 16, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }} numberOfLines={1}>{group.filename}</Text>
                  <Text style={{ fontSize: 11, color: c.textLight, marginTop: 4 }}>Importado: {group.imported_at}</Text>
                  <Text style={{ fontSize: 12, color: c.primary, fontWeight: '600', marginTop: 2 }}>{group.count} transacciones creadas</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteGroup(group)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.expense + '15', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="trash-outline" size={20} color={c.expense} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
