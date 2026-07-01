export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  is_default: number;
  parent_id?: number | null;
}

export type AccountType = 'cash' | 'bank' | 'digital';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  bank_name: string;
  account_number: string;
  icon: string;
  color: string;
  balance: number;
  is_default: number;
  currency_code: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category_id: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_id?: number;
  account_name?: string;
  destination_account_id?: number;
  destination_account_name?: string;
  description: string;
  date: string;
  created_at: string;
}

export interface Budget {
  id: number;
  category_id: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
  is_recurring?: number;
}

export interface MonthlySummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

export interface CategorySummary {
  category_id: number;
  category_name: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  currency_code: string;
  deadline?: string;
  color: string;
}

export interface RecurringTransaction {
  id: number;
  amount: number;
  type: TransactionType;
  category_id: number;
  category_name?: string;
  source_account_id: number;
  source_account_name?: string;
  destination_account_id?: number;
  destination_account_name?: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  next_date: string;
  is_active: number;
}

