import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
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

  const path = `${cacheDirectory}export_${new Date().toISOString().split('T')[0]}.csv`;
  await writeAsStringAsync(path, csv, { encoding: EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv' });
  }

  return path;
}
