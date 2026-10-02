export type FinancialGroup =
  | 'income'
  | 'fixed_expense'
  | 'variable_expense'
  | 'ant_expense'
  | 'savings_debt';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'savings_deposit'
  | 'savings_withdrawal'
  | 'debt_payment'
  | 'balance_adjustment';

export type AccountType =
  | 'cash'
  | 'bank'
  | 'digital_wallet'
  | 'savings'
  | 'other';

export type InstallmentStatus =
  | 'pending'
  | 'upcoming'
  | 'overdue'
  | 'paid'
  | 'cancelled';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  primaryCurrency: string; // e.g. 'ARS', 'USD', 'EUR'
  timezone: string;
  privacyModeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  group: FinancialGroup;
  icon: string;
  color: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  notes?: string;
  paymentMethod?: string;
  tags?: string[];
  occurredAt: string; // ISO 8601 UTC
  createdAt: string;  // Server creation timestamp ISO 8601 UTC
  updatedAt: string;
  idempotencyKey: string;
  syncStatus: 'synced' | 'pending_sync';
  installmentPlanId?: string;
  installmentNumber?: number;
  transferDestinationAccountId?: string;
  savingsGoalId?: string;
  debtId?: string;
}

export interface InstallmentPlan {
  id: string;
  userId: string;
  description: string;
  totalAmount: number;
  installmentsCount: number;
  periodicity: 'monthly' | 'biweekly';
  firstDueDate: string; // YYYY-MM-DD
  categoryId: string;
  accountId: string;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Installment {
  id: string;
  planId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paidDate?: string;
  paidAmount?: number;
  status: InstallmentStatus;
  transactionId?: string;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  periodMonth: string; // YYYY-MM
  targetType: 'general' | 'category' | 'group';
  targetId?: string; // categoryId or FinancialGroup name
  limitAmount: number;
  spentAmount: number;
  alertLevelTriggered: number; // 0, 70, 90, 100, 101
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  accountId?: string;
  icon: string;
  color: string;
  status: 'in_progress' | 'completed' | 'paused';
  createdAt: string;
}

export interface Debt {
  id: string;
  userId: string;
  creditorName: string;
  description?: string;
  originalAmount: number;
  remainingCapital: number;
  interestRate?: number;
  dueDate?: string;
  status: 'active' | 'paid' | 'cancelled';
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  userId: string;
  monthPeriod: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  fixedExpense: number;
  variableExpense: number;
  antExpense: number;
  savingsNet: number;
  debtRepaid: number;
  balance: number;
  topCategories: { categoryId: string; name: string; amount: number; percentage: number; color: string }[];
  budgetPerformance: { budgetName: string; limit: number; spent: number; percentage: number }[];
  installmentCommitments: { pendingCount: number; pendingAmount: number };
  aiObservations?: string;
  generatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  read: boolean;
  createdAt: string;
}
