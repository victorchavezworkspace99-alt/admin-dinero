export type TransactionType = 'income' | 'expense';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  is_default: number;
}

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category_id: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
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
