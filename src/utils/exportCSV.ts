import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getTransactions } from '../database/database';
import { formatCurrency } from '../store/SettingsStore';

export async function exportTransactionsToCSV(): Promise<string> {
  const transactions = await getTransactions();

  const headers = ['Fecha', 'Tipo', 'Categoria', 'Descripcion', 'Monto'];
  const rows = transactions.map(t => [
    t.date,
    t.type === 'income' ? 'Ingreso' : 'Gasto',
    `"${t.category_name}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    formatCurrency(t.amount),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const path = `${FileSystem.cacheDirectory}export_${new Date().toISOString().split('T')[0]}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv' });
  }

  return path;
}
