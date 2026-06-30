import * as SQLite from 'expo-sqlite';
import { DefaultCategories } from '../theme/colors';
import { Transaction, Category, Budget, MonthlySummary, CategorySummary } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('finanzas.db');
  }
  return db;
}

const SCHEMA_VERSION = 1;

export async function initDatabase(): Promise<void> {
  const database = await openDatabase();

  const versionResult = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionResult?.user_version ?? 0;

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

    await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
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

export async function addCategory(name: string, type: 'income' | 'expense', icon: string, color: string): Promise<number> {
  const database = await openDatabase();
  const result = await database.runAsync(
    'INSERT INTO categories (name, type, icon, color, is_default) VALUES (?, ?, ?, ?, 0)',
    [name, type, icon, color]
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
  await database.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM transactions WHERE category_id = ?', [id]);
    await txn.runAsync('DELETE FROM budgets WHERE category_id = ?', [id]);
    await txn.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
  });
}

export async function addTransaction(
  amount: number,
  type: 'income' | 'expense',
  category_id: number,
  description: string,
  date: string
): Promise<number> {
  const database = await openDatabase();
  const result = await database.runAsync(
    'INSERT INTO transactions (amount, type, category_id, description, date) VALUES (?, ?, ?, ?, ?)',
    [amount, type, category_id, description, date]
  );
  return result.lastInsertRowId;
}

export async function getTransactions(
  type?: 'income' | 'expense',
  category_id?: number,
  month?: number,
  year?: number,
  search?: string
): Promise<Transaction[]> {
  const database = await openDatabase();
  let query = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (type) { query += ' AND t.type = ?'; params.push(type); }
  if (category_id) { query += ' AND t.category_id = ?'; params.push(category_id); }
  if (month && year) {
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
      c.id as category_id, c.name as category_name, c.icon, c.color,
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
      b.id, b.category_id, b.amount, b.month, b.year,
      c.name as category_name, c.icon as category_icon, c.color as category_color,
      COALESCE((SELECT SUM(t.amount) FROM transactions t
        WHERE t.category_id = b.category_id
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

export async function setBudget(category_id: number, amount: number, month: number, year: number): Promise<void> {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO budgets (category_id, amount, month, year)
     VALUES (?, ?, ?, ?)`,
    [category_id, amount, month, year]
  );
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

export async function getCategorySummaryForDateRange(
  startDate: string,
  endDate: string,
  type: 'income' | 'expense'
): Promise<CategorySummary[]> {
  const database = await openDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT
      c.id as category_id, c.name as category_name, c.icon, c.color,
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
