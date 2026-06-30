import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { CURRENCIES, Currency, ThemeMode } from '../store/SettingsStore';
import { exportTransactionsToCSV } from '../utils/exportCSV';

export function SettingsScreen() {
  const { colors, settings, updateSettings } = useTheme();
  const [showCurrency, setShowCurrency] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showName, setShowName] = useState(false);
  const [editName, setEditName] = useState(settings.userName);
  const [exporting, setExporting] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleReset = () => {
    Alert.alert('Reiniciar Datos', 'Se eliminaran todas las transacciones y presupuestos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reiniciar', style: 'destructive', onPress: async () => {
        try {
          const { openDatabase } = await import('../database/database');
          const db = await openDatabase();
          await db.execAsync('DELETE FROM transactions; DELETE FROM budgets;');
          Alert.alert('Listo', 'Datos reiniciados');
        } catch { }
      }},
    ]);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTransactionsToCSV();
    } catch {
      Alert.alert('Error', 'No se pudo exportar');
    }
    setExporting(false);
  };

  const [backingUp, setBackingUp] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const { exportDatabase } = await import('../database/database');
      const srcUri = await exportDatabase();
      const { File } = await import('expo-file-system');
      const srcFile = new File(srcUri);
      const bytes = await srcFile.bytes();
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const { StorageAccessFramework } = await import('expo-file-system/legacy');
      const destUri = await StorageAccessFramework.createFileAsync(
        StorageAccessFramework.getUriForDirectoryInRoot('Downloads'),
        'BalancePro-backup.db',
        'application/octet-stream'
      );
      await StorageAccessFramework.writeAsStringAsync(destUri, base64, {
        encoding: 'base64',
      });
      Alert.alert('Exportado', 'Base de datos guardada en la carpeta Descargas.');
    } catch {
      Alert.alert('Error', 'No se pudo exportar la base de datos');
    }
    setBackingUp(false);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { File } = await import('expo-file-system');
      const result = await File.pickFileAsync({ mimeTypes: '*/*' });
      if (result.canceled || !result.result) { setImporting(false); return; }
      const { importDatabase, initDatabase } = await import('../database/database');
      await importDatabase(result.result.uri);
      await initDatabase();
      Alert.alert('Importado', 'Base de datos restaurada correctamente. Reinicia la app para aplicar los cambios.');
    } catch {
      Alert.alert('Error', 'No se pudo importar la base de datos. Asegurate de seleccionar un archivo .db valido.');
    }
    setImporting(false);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const Updates = await import('expo-updates');
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert('Actualizacion JS disponible', 'Descargando...', [
          { text: 'Aplicar ahora', onPress: async () => {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }},
          { text: 'Despues', style: 'cancel' },
        ]);
        setCheckingUpdate(false);
        return;
      }
    } catch {}

    const { checkNativeUpdate, downloadAndInstallAPK } = await import('../utils/checkNativeUpdate');
    const nativeUpdate = await checkNativeUpdate();
    if (nativeUpdate) {
      Alert.alert(
        'Nueva version disponible',
        `v${nativeUpdate.latestVersion}\n\n${nativeUpdate.changelog}`,
        [
          { text: 'Descargar e Instalar', onPress: () => downloadAndInstallAPK(nativeUpdate.apkUrl, nativeUpdate.latestVersion) },
          { text: 'Ahora no', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert('Sin actualizaciones', 'Ya tienes la version mas reciente');
    }
    setCheckingUpdate(false);
  };

  const c = colors;
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { backgroundColor: c.primary, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
    title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    section: { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 8, marginLeft: 4, letterSpacing: -0.3 },
    item: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
      borderRadius: 14, padding: 16, marginBottom: 6,
      shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1,
    },
    iconWrap: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    itemLabel: { fontSize: 15, fontWeight: '600', color: c.text, letterSpacing: -0.2, flex: 1 },
    itemValue: { fontSize: 14, color: c.textSecondary, marginRight: 6 },
    aboutCard: {
      backgroundColor: c.surface, borderRadius: 20, padding: 28, alignItems: 'center',
      shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    },
    aboutIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: c.primaryLight, justifyContent: 'center', alignItems: 'center' },
    appName: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 14, letterSpacing: -0.5 },
    appDesc: { fontSize: 13, color: c.textSecondary, marginTop: 4, textAlign: 'center', lineHeight: 18 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '70%' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 16, letterSpacing: -0.4 },
    modalItem: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12,
      borderRadius: 12, marginBottom: 4,
    },
    modalItemActive: { backgroundColor: c.primaryLight },
    modalCode: { fontSize: 18, fontWeight: '700', color: c.text, width: 50 },
    modalName: { fontSize: 15, color: c.text, flex: 1 },
    modalCheck: { color: c.primary, fontSize: 20 },
    nameInput: {
      fontSize: 17, fontWeight: '500', color: c.text, backgroundColor: c.background,
      borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: c.border,
    },
    nameModalContent: {
      backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24,
    },
  });

  const sections = [
    {
      label: 'Perfil',
      items: [
        {
          icon: 'person-outline', label: 'Nombre', value: settings.userName || 'Tocar para asignar',
          color: '#8B5CF6', onPress: () => { setEditName(settings.userName); setShowName(true); },
        },
      ],
    },
    {
      label: 'General',
      items: [
        {
          icon: 'cash-outline', label: 'Moneda', value: `${settings.currency.symbol} ${settings.currency.code}`,
          color: '#0FA870', onPress: () => setShowCurrency(true),
        },
        {
          icon: 'moon-outline', label: 'Tema', value: settings.theme === 'dark' ? 'Oscuro' : 'Claro',
          color: '#8B5CF6', onPress: () => setShowTheme(true),
        },
        {
          icon: 'calendar-outline', label: 'Inicio de Semana', value: settings.firstDay === 'monday' ? 'Lunes' : 'Domingo',
          color: '#1A6DF0', onPress: () => {
            updateSettings({ firstDay: settings.firstDay === 'monday' ? 'sunday' : 'monday' });
          },
        },
      ],
    },
    {
      label: 'Datos',
      items: [
        {
          icon: 'download-outline', label: 'Exportar CSV', value: exporting ? 'Exportando...' : '',
          color: '#0E94D9', onPress: handleExport,
        },
        {
          icon: 'cloud-upload-outline', label: 'Exportar Base de Datos', value: backingUp ? 'Exportando...' : '',
          color: '#6366F1', onPress: handleBackup,
        },
        {
          icon: 'cloud-download-outline', label: 'Importar Base de Datos', value: importing ? 'Importando...' : '',
          color: '#D97706', onPress: handleImport,
        },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { icon: 'phone-portrait-outline', label: 'Version', value: '1.0.0', color: c.textSecondary },
        {
          icon: 'cloud-download-outline', label: 'Buscar Actualizaciones', value: checkingUpdate ? 'Buscando...' : '',
          color: '#3B82F6', onPress: handleCheckUpdate,
        },
        {
          icon: 'trash-outline', label: 'Reiniciar Datos', value: '',
          color: '#E04848', onPress: handleReset,
        },
      ],
    },
  ];

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Configuracion</Text>
      </View>

      {sections.map((sec, si) => (
        <View key={si} style={s.section}>
          <Text style={s.sectionTitle}>{sec.label}</Text>
          {sec.items.map((item, ii) => (
            <TouchableOpacity
              key={ii} style={s.item} onPress={item.onPress}
              disabled={!item.onPress} activeOpacity={0.7}
            >
              <View style={[s.iconWrap, { backgroundColor: item.color + '16' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.itemLabel}>{item.label}</Text>
              {item.value ? <Text style={s.itemValue}>{item.value}</Text> : null}
              {item.onPress && <Ionicons name="chevron-forward" size={18} color={c.textLight} />}
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Acerca de</Text>
        <View style={s.aboutCard}>
          <View style={s.aboutIcon}>
            <Ionicons name="wallet" size={28} color={c.primary} />
          </View>
          <Text style={s.appName}>Balance Pro</Text>
          <Text style={s.appDesc}>Control financiero inteligente</Text>
          <Text style={s.appDesc}>Datos almacenados localmente en el dispositivo.</Text>
        </View>
      </View>

      <View style={{ height: 100 }} />

      <Modal visible={showCurrency} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Seleccionar Moneda</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(i) => i.code}
              renderItem={({ item }: { item: Currency }) => (
                <TouchableOpacity
                  style={[s.modalItem, settings.currency.code === item.code && s.modalItemActive]}
                  onPress={async () => {
                    await updateSettings({ currency: item });
                    setShowCurrency(false);
                  }}
                >
                  <Text style={s.modalCode}>{item.symbol}</Text>
                  <Text style={s.modalName}>{item.name} ({item.code})</Text>
                  {settings.currency.code === item.code && (
                    <Ionicons name="checkmark-circle" size={22} color={c.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showTheme} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Seleccionar Tema</Text>
            {(['light', 'dark'] as ThemeMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[s.modalItem, settings.theme === mode && s.modalItemActive]}
                onPress={async () => {
                  await updateSettings({ theme: mode });
                  setShowTheme(false);
                }}
              >
                <Ionicons
                  name={mode === 'light' ? 'sunny' : 'moon'}
                  size={22}
                  color={settings.theme === mode ? c.primary : c.textSecondary}
                  style={{ marginRight: 14 }}
                />
                <Text style={s.modalName}>{mode === 'light' ? 'Claro' : 'Oscuro'}</Text>
                {settings.theme === mode && (
                  <Ionicons name="checkmark-circle" size={22} color={c.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showName} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.nameModalContent}>
            <Text style={s.modalTitle}>Editar Nombre</Text>
            <TextInput
              style={s.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tu nombre"
              placeholderTextColor={c.textLight}
              maxLength={30}
              autoFocus
            />
            <TouchableOpacity
              style={{ backgroundColor: c.primary, borderRadius: 14, padding: 14, alignItems: 'center' }}
              onPress={async () => {
                await updateSettings({ userName: editName.trim() || 'Usuario' });
                setShowName(false);
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
