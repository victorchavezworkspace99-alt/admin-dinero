import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DefaultCategories } from '../theme/colors';
import { Transaction, Category, Budget, MonthlySummary, CategorySummary, Account, TransactionType, RecurringTransaction } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('finanzas.db');
  }
  return db;
}

const SCHEMA_VERSION = 4;

export async function initDatabase(): Promise<void> {
  let database = await openDatabase();
  let currentVersion = 0;

  try {
    const versionResult = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    currentVersion = versionResult?.user_version ?? 0;
  } catch {
    if (db) { await db.closeAsync(); db = null; }
    try {
      const { deleteDatabaseAsync } = await import('expo-sqlite');
      await deleteDatabaseAsync('finanzas.db');
    } catch {}
    database = await openDatabase();
    currentVersion = 0;
  }

  if (currentVersion < 1) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        is_default INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category_id INTEGER NOT NULL,
        description TEXT DEFAULT '',
        date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
        year INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(category_id, month, year)
      );
    `);

    const count = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
    if (count?.count === 0) {
      for (const cat of DefaultCategories) {
        await database.runAsync(
          'INSERT INTO categories (name, type, icon, color, is_default) VALUES (?, ?, ?, ?, 1)',
          [cat.name, cat.type, cat.icon, cat.color]
        );
      }
    }

    await database.execAsync(`PRAGMA user_version = 1`);
  }

  if (currentVersion < 2) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('cash', 'bank', 'digital')),
        bank_name TEXT DEFAULT '',
        account_number TEXT DEFAULT '',
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        is_default INTEGER DEFAULT 0
      );
      ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
    `);

    const accCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
    if (accCount?.count === 0) {
      const defaultAccounts = [
        { name: 'Efectivo', type: 'cash', bank_name: '', icon: 'cash-outline', color: '#10B981' },
        { name: 'BCP', type: 'bank', bank_name: 'BCP', icon: 'business-outline', color: '#3B82F6' },
        { name: 'Interbank', type: 'bank', bank_name: 'Interbank', icon: 'business-outline', color: '#8B5CF6' },
        { name: 'Yape', type: 'digital', bank_name: 'BCP', icon: 'phone-portrait-outline', color: '#E04848' },
      ];
      for (const a of defaultAccounts) {
        await database.runAsync(
          'INSERT INTO accounts (name, type, bank_name, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 1)',
          [a.name, a.type, a.bank_name, a.icon, a.color]
        );
      }
    }

    const txCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM pragma_table_info("transactions") WHERE name="account_id"');
    if (txCount?.count === 0) {
      await database.execAsync('ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL');
    }

    await database.execAsync(`PRAGMA user_version = 2`);
  }

  if (currentVersion < 3) {
    const colExists = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info("budgets") WHERE name="is_recurring"`
    );
    if (colExists?.count === 0) {
      await database.execAsync('ALTER TABLE budgets ADD COLUMN is_recurring INTEGER DEFAULT 0');
    }
    await database.execAsync(`PRAGMA user_version = 3`);
  }

  if (currentVersion < 4) {
    const catColExists = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info("categories") WHERE name="parent_id"`
    );
    if (catColExists?.count === 0) {
      await database.execAsync('ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');
    }

    const accColExists = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info("accounts") WHERE name="currency_code"`
    );
    if (accColExists?.count === 0) {
      await database.execAsync("ALTER TABLE accounts ADD COLUMN currency_code TEXT DEFAULT 'PEN'");
    }

    const txDestColExists = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info("transactions") WHERE name="destination_account_id"`
    );
    if (txDestColExists?.count === 0) {
      await database.execAsync(`
        ALTER TABLE transactions RENAME TO transactions_old;
        
        CREATE TABLE transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
          category_id INTEGER NOT NULL,
          description TEXT DEFAULT '',
          date TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now','localtime')),
          account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
          destination_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
        
        INSERT INTO transactions (id, amount, type, category_id, description, date, created_at, account_id)
        SELECT id, amount, type, category_id, description, date, created_at, account_id FROM transactions_old;
        
        DROP TABLE transactions_old;
      `);
    }

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL NOT NULL DEFAULT 0,
        currency_code TEXT DEFAULT 'PEN',
        deadline TEXT,
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
        category_id INTEGER NOT NULL,
        source_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        destination_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        description TEXT DEFAULT '',
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        start_date TEXT NOT NULL,
        next_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `);

    await database.execAsync(`PRAGMA user_version = 4`);
  }
}

export async function getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
  const database = await openDatabase();
  let query = 'SELECT * FROM categories';
  const params: any[] = [];
  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }
  query += ' ORDER BY name';
  return database.getAllAsync<Category>(query, params);
}

export async function addCategory(name: string, type: 'income' | 'expense', icon: string, color: string, parent_id?: number | null): Promise<number> {
  const database = await openDatabase();
  const result = await database.runAsync(
    'INSERT INTO categories (name, type, icon, color, is_default, parent_id) VALUES (?, ?, ?, ?, 0, ?)',
    [name, type, icon, color, parent_id ?? null]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(id: number, name: string, icon: string, color: string): Promise<void> {
  const database = await openDatabase();
  await database.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
    [name, icon, color, id]
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const database = await openDatabase();
  const txCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?', [id]
  );
  if ((txCount?.count ?? 0) > 0) {
    throw new Error('No se puede eliminar una categoría con transacciones. Desvincula o elimina las transacciones primero.');
  }
  await database.runAsync('DELETE FROM budgets WHERE category_id = ?', [id]);
  await database.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function getAccounts(): Promise<Account[]> {
  const database = await openDatabase();
  return database.getAllAsync<Account>('SELECT * FROM accounts ORDER BY type, name');
}

export async function getAccountBalance(id: number): Promise<number> {
  const database = await openDatabase();
  const result = await database.getFirstAsync<{ balance: number }>(
    `SELECT (
       COALESCE((SELECT SUM(amount) FROM transactions WHERE (type = 'income' AND account_id = ?) OR (type = 'transfer' AND destination_account_id = ?)), 0) -
       COALESCE((SELECT SUM(amount) FROM transactions WHERE (type = 'expense' AND account_id = ?) OR (type = 'transfer' AND account_id = ?)), 0)
     ) as balance`,
    [id, id, id, id]
  );
  return result?.balance ?? 0;
}

export async function getBalancesByAccount(): Promise<{ id: number; name: string; type: string; icon: string; color: string; currency_code: string; balance: number }[]> {
  const database = await openDatabase();
  return database.getAllAsync<any>(
    `SELECT a.id, a.name, a.type, a.icon, a.color, a.currency_code,
       (
         COALESCE((SELECT SUM(amount) FROM transactions WHERE (type = 'income' AND account_id = a.id) OR (type = 'transfer' AND destination_account_id = a.id)), 0) -
         COALESCE((SELECT SUM(amount) FROM transactions WHERE (type = 'expense' AND account_id = a.id) OR (type = 'transfer' AND account_id = a.id)), 0)
       ) as balance
     FROM accounts a
     ORDER BY a.type, a.name`
  );
}

export async function addAccount(
  name: string,
  type: 'cash' | 'bank' | 'digital',
  bank_name: string,
  account_number: string,
  icon: string,
  color: string,
  currency_code = 'PEN'
): Promise<number> {
  const database = await openDatabase();
  const result = await database.runAsync(
    'INSERT INTO accounts (name, type, bank_name, account_number, icon, color, is_default, currency_code) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
    [name, type, bank_name, account_number, icon, color, currency_code]
  );
  return result.lastInsertRowId;
}

export async function updateAccount(
  id: number,
  name: string,
  type: 'cash' | 'bank' | 'digital',
  bank_name: string,
  account_number: string,
  icon: string,
  color: string,
  currency_code = 'PEN'
): Promise<void> {
  const database = await openDatabase();
  await database.runAsync(
    'UPDATE accounts SET name = ?, type = ?, bank_name = ?, account_number = ?, icon = ?, color = ?, currency_code = ? WHERE id = ?',
    [name, type, bank_name, account_number, icon, color, currency_code, id]
  );
}

export async function deleteAccount(id: number): Promise<void> {
  const database = await openDatabase();
  const txCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE account_id = ?', [id]
  );
  if ((txCount?.count ?? 0) > 0) {
    throw new Error('No se puede eliminar una cuenta con transacciones. Desvincula o elimina las transacciones primero.');
  }
  await database.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
}

export async function addTransaction(
  amount: number,
  type: TransactionType,
  category_id: number | null,
  description: string,
  date: string,
  account_id?: number,
  destination_account_id?: number
): Promise<number> {
  const database = await openDatabase();
  const result = await database.runAsync(
    'INSERT INTO transactions (amount, type, category_id, description, date, account_id, destination_account_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [amount, type, category_id ?? null, description, date, account_id ?? null, destination_account_id ?? null]
  );
  return result.lastInsertRowId;
}

export async function getTransactions(
  type?: TransactionType,
  category_id?: number,
  month?: number,
  year?: number,
  search?: string,
  account_id?: number,
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> {
  const database = await openDatabase();
  let query = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
       COALESCE(a.name, '') as account_name,
       COALESCE(da.name, '') as destination_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts da ON t.destination_account_id = da.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (type) { query += ' AND t.type = ?'; params.push(type); }
  if (category_id) { query += ' AND t.category_id = ?'; params.push(category_id); }
  if (account_id) {
    query += ' AND (t.account_id = ? OR t.destination_account_id = ?)';
    params.push(account_id, account_id);
  }
  if (startDate && endDate) {
    query += ' AND t.date >= ? AND t.date <= ?';
    params.push(startDate, endDate);
  } else if (month && year) {
    query += " AND CAST(strftime('%m', t.date) AS INTEGER) = ? AND CAST(strftime('%Y', t.date) AS INTEGER) = ?";
    params.push(month, year);
  }
  if (search) {
    query += ' AND (t.description LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.date DESC, t.id DESC';

  return database.getAllAsync<Transaction>(query, params);
}

export async function updateTransaction(
  id: number,
  amount: number,
  type: TransactionType,
  category_id: number | null,
  description: string,
  date: string,
  account_id?: number,
  destination_account_id?: number
): Promise<void> {
  const database = await openDatabase();
  await database.runAsync(
    'UPDATE transactions SET amount = ?, type = ?, category_id = ?, description = ?, date = ?, account_id = ?, destination_account_id = ? WHERE id = ?',
    [amount, type, category_id ?? null, description, date, account_id ?? null, destination_account_id ?? null, id]
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function getMonthlySummary(month: number, year: number): Promise<MonthlySummary> {
  const database = await openDatabase();
  const result = await database.getFirstAsync<{ income: number; expense: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE CAST(strftime('%m', date) AS INTEGER) = ? AND CAST(strftime('%Y', date) AS INTEGER) = ?`,
    [month, year]
  );
  return {
    month,
    year,
    income: result?.income ?? 0,
    expense: result?.expense ?? 0,
    balance: (result?.income ?? 0) - (result?.expense ?? 0),
  };
}

export async function getCategorySummary(month: number, year: number, type: 'income' | 'expense'): Promise<CategorySummary[]> {
  const database = await openDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT
      c.id as category_id, c.name as category_name, c.icon, c.color, c.parent_id,
      COALESCE(SUM(t.amount), 0) as total
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id
      AND CAST(strftime('%m', t.date) AS INTEGER) = ?
      AND CAST(strftime('%Y', t.date) AS INTEGER) = ?
    WHERE c.type = ?
    GROUP BY c.id
    ORDER BY total DESC`,
    [month, year, type]
  );

  const summaries: CategorySummary[] = rows.map((r: any) => ({ ...r, percentage: 0 }));
  const grandTotal = summaries.reduce((s, r) => s + r.total, 0);
  summaries.forEach((s) => {
    s.percentage = grandTotal > 0 ? (s.total / grandTotal) * 100 : 0;
  });
  return summaries;
}

export async function getBudgets(month: number, year: number): Promise<Budget[]> {
  const database = await openDatabase();
  return database.getAllAsync<Budget>(
    `SELECT
      b.id, b.category_id, b.amount, b.month, b.year, b.is_recurring,
      c.name as category_name, c.icon as category_icon, c.color as category_color,
      COALESCE((SELECT SUM(t.amount) FROM transactions t
        WHERE (t.category_id = b.category_id OR t.category_id IN (SELECT id FROM categories WHERE parent_id = b.category_id))
        AND CAST(strftime('%m', t.date) AS INTEGER) = b.month
        AND CAST(strftime('%Y', t.date) AS INTEGER) = b.year
        AND t.type = 'expense'), 0) as spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.month = ? AND b.year = ?
    ORDER BY c.name`,
    [month, year]
  );
}

export async function setBudget(category_id: number, amount: number, month: number, year: number, is_recurring = 0): Promise<void> {
  const database = await openDatabase();
  const existing = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM budgets WHERE category_id = ? AND month = ? AND year = ?',
    [category_id, month, year]
  );
  if (existing) {
    await database.runAsync(
      'UPDATE budgets SET amount = ?, is_recurring = ? WHERE id = ?',
      [amount, is_recurring, existing.id]
    );
  } else {
    await database.runAsync(
      'INSERT INTO budgets (category_id, amount, month, year, is_recurring) VALUES (?, ?, ?, ?, ?)',
      [category_id, amount, month, year, is_recurring]
    );
  }
}

export async function updateBudget(id: number, amount: number, is_recurring: number): Promise<void> {
  const database = await openDatabase();
  await database.runAsync(
    'UPDATE budgets SET amount = ?, is_recurring = ? WHERE id = ?',
    [amount, is_recurring, id]
  );
}

export async function copyRecurringBudgets(fromMonth: number, fromYear: number, toMonth: number, toYear: number): Promise<void> {
  const database = await openDatabase();
  const budgets = await database.getAllAsync<{ category_id: number; amount: number }>(
    'SELECT category_id, amount FROM budgets WHERE month = ? AND year = ? AND is_recurring = 1',
    [fromMonth, fromYear]
  );
  for (const b of budgets) {
    const existing = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM budgets WHERE category_id = ? AND month = ? AND year = ?',
      [b.category_id, toMonth, toYear]
    );
    if (!existing) {
      await database.runAsync(
        'INSERT INTO budgets (category_id, amount, month, year, is_recurring) VALUES (?, ?, ?, ?, 1)',
        [b.category_id, b.amount, toMonth, toYear]
      );
    }
  }
}

export async function deleteBudget(id: number): Promise<void> {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

export async function getBalance(): Promise<number> {
  const database = await openDatabase();
  const result = await database.getFirstAsync<{ balance: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
    FROM transactions`
  );
  return result?.balance ?? 0;
}

export async function getMonthlyTrends(months: number): Promise<{ month: number; year: number; income: number; expense: number }[]> {
  const database = await openDatabase();
  const now = new Date();
  const results: { month: number; year: number; income: number; expense: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const row = await database.getFirstAsync<{ income: number; expense: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE CAST(strftime('%m', date) AS INTEGER) = ? AND CAST(strftime('%Y', date) AS INTEGER) = ?`,
      [m, y]
    );
    results.push({ month: m, year: y, income: row?.income ?? 0, expense: row?.expense ?? 0 });
  }
  return results;
}

export async function getSummaryForDateRange(startDate: string, endDate: string): Promise<{ income: number; expense: number; balance: number }> {
  const database = await openDatabase();
  const result = await database.getFirstAsync<{ income: number; expense: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE date >= ? AND date <= ?`,
    [startDate, endDate]
  );
  return {
    income: result?.income ?? 0,
    expense: result?.expense ?? 0,
    balance: (result?.income ?? 0) - (result?.expense ?? 0),
  };
}

export async function getCategorySummaryForDateRange(
  startDate: string,
  endDate: string,
  type: 'income' | 'expense'
): Promise<CategorySummary[]> {
  const database = await openDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT
      c.id as category_id, c.name as category_name, c.icon, c.color, c.parent_id,
      COALESCE(SUM(t.amount), 0) as total
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id
      AND t.date >= ? AND t.date <= ?
    WHERE c.type = ?
    GROUP BY c.id
    ORDER BY total DESC`,
    [startDate, endDate, type]
  );

  const summaries: CategorySummary[] = rows.map((r: any) => ({ ...r, percentage: 0 }));
  const grandTotal = summaries.reduce((s, r) => s + r.total, 0);
  summaries.forEach((s) => {
    s.percentage = grandTotal > 0 ? (s.total / grandTotal) * 100 : 0;
  });
  return summaries;
}

export async function getDatabasePath(): Promise<string> {
  const database = await openDatabase();
  const row = await database.getFirstAsync<{ file: string }>('PRAGMA database_list');
  return row?.file || '';
}

export async function exportDatabase(): Promise<string> {
  let dbPath = await getDatabasePath();
  if (!dbPath) {
    const { defaultDatabaseDirectory } = await import('expo-sqlite');
    const { cacheDirectory } = await import('expo-file-system/legacy');
    const dir = typeof defaultDatabaseDirectory === 'string' ? defaultDatabaseDirectory : `${cacheDirectory}SQLite/`;
    dbPath = dir.endsWith('/') ? `${dir}finanzas.db` : `${dir}/finanzas.db`;
  }
  const filePrefix = dbPath.startsWith('file://') ? '' : 'file://';
  const { cacheDirectory, copyAsync } = await import('expo-file-system/legacy');
  const destPath = `${cacheDirectory}BalancePro-backup.db`;
  await copyAsync({ from: `${filePrefix}${dbPath}`, to: destPath });
  return destPath;
}

export async function importDatabase(legacyFileUri: string): Promise<void> {
  let dbPath = await getDatabasePath();
  if (!dbPath) {
    const { defaultDatabaseDirectory } = await import('expo-sqlite');
    const { cacheDirectory } = await import('expo-file-system/legacy');
    const dir = typeof defaultDatabaseDirectory === 'string' ? defaultDatabaseDirectory : `${cacheDirectory}SQLite/`;
    dbPath = dir.endsWith('/') ? `${dir}finanzas.db` : `${dir}/finanzas.db`;
  }
  if (db) {
    await db.closeAsync();
    db = null;
  }
  const filePrefix = dbPath.startsWith('file://') ? '' : 'file://';
  const { copyAsync } = await import('expo-file-system/legacy');
  await copyAsync({ from: legacyFileUri, to: `${filePrefix}${dbPath}` });
}

export async function checkAndAutoCopyRecurringBudgets(): Promise<void> {
  try {
    const now = new Date();
    const currentM = now.getMonth() + 1;
    const currentY = now.getFullYear();
    const currentKey = `${currentY}-${currentM}`;

    const lastCopiedKey = await AsyncStorage.getItem('@last_copied_budget_month');
    if (lastCopiedKey !== currentKey) {
      let prevM = currentM - 1;
      let prevY = currentY;
      if (prevM < 1) {
        prevM = 12;
        prevY--;
      }

      await copyRecurringBudgets(prevM, prevY, currentM, currentY);
      await AsyncStorage.setItem('@last_copied_budget_month', currentKey);
    }
  } catch (error) {
    console.error('Error auto-copying recurring budgets:', error);
  }
}

export async function processRecurringTransactions(): Promise<void> {
  const database = await openDatabase();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const activeRecs = await database.getAllAsync<any>(
    'SELECT * FROM recurring_transactions WHERE is_active = 1 AND next_date <= ?',
    [todayStr]
  );

  for (const rec of activeRecs) {
    let nextDate = new Date(rec.next_date + 'T00:00:00');
    
    while (true) {
      const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      if (nextDateStr > todayStr) break;

      await database.runAsync(
        'INSERT INTO transactions (amount, type, category_id, description, date, account_id, destination_account_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          rec.amount,
          rec.type,
          rec.category_id,
          rec.description,
          nextDateStr,
          rec.source_account_id,
          rec.destination_account_id
        ]
      );

      if (rec.frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (rec.frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (rec.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (rec.frequency === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
    }

    const updatedNextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    await database.runAsync(
      'UPDATE recurring_transactions SET next_date = ? WHERE id = ?',
      [updatedNextDateStr, rec.id]
    );
  }
}

export async function getRecurringTransactions(): Promise<RecurringTransaction[]> {
  const database = await openDatabase();
  return database.getAllAsync<RecurringTransaction>(
    `SELECT rt.*, c.name as category_name, a.name as source_account_name, da.name as destination_account_name
     FROM recurring_transactions rt
     LEFT JOIN categories c ON rt.category_id = c.id
     JOIN accounts a ON rt.source_account_id = a.id
     LEFT JOIN accounts da ON rt.destination_account_id = da.id
     ORDER BY rt.id DESC`
  );
}

export async function addRecurringTransaction(
  amount: number,
  type: TransactionType,
  category_id: number | null,
  source_account_id: number,
  destination_account_id: number | null,
  description: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  start_date: string
): Promise<number> {
  const database = await openDatabase();
  const result = await database.runAsync(
    'INSERT INTO recurring_transactions (amount, type, category_id, source_account_id, destination_account_id, description, frequency, start_date, next_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
    [amount, type, category_id, source_account_id, destination_account_id, description, frequency, start_date, start_date]
  );
  return result.lastInsertRowId;
}

export async function updateRecurringTransaction(
  id: number,
  amount: number,
  type: TransactionType,
  category_id: number | null,
  source_account_id: number,
  destination_account_id: number | null,
  description: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  start_date: string,
  next_date: string,
  is_active: number
): Promise<void> {
  const database = await openDatabase();
  await database.runAsync(
    'UPDATE recurring_transactions SET amount = ?, type = ?, category_id = ?, source_account_id = ?, destination_account_id = ?, description = ?, frequency = ?, start_date = ?, next_date = ?, is_active = ? WHERE id = ?',
    [amount, type, category_id, source_account_id, destination_account_id, description, frequency, start_date, next_date, is_active, id]
  );
}

export async function deleteRecurringTransaction(id: number): Promise<void> {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
}
