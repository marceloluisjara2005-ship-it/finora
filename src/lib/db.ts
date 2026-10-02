import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Category,
  Transaction,
  InstallmentPlan,
  Installment,
  Budget,
  SavingsGoal,
  Debt,
  AppNotification,
  UserProfile,
} from '../types/finance';

export interface OutboxItem {
  id: string;
  idempotencyKey: string;
  action: 'create_transaction' | 'update_transaction' | 'delete_transaction' | 'update_budget';
  payload: any;
  createdAt: string;
  retryCount: number;
}

export class FinoraDatabase extends Dexie {
  profiles!: Table<UserProfile, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  installmentPlans!: Table<InstallmentPlan, string>;
  installments!: Table<Installment, string>;
  budgets!: Table<Budget, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  debts!: Table<Debt, string>;
  notifications!: Table<AppNotification, string>;
  outbox!: Table<OutboxItem, string>;

  constructor() {
    super('finora_finance_db');
    this.version(1).stores({
      profiles: 'id, email',
      accounts: 'id, userId, type, isActive',
      categories: 'id, userId, group, isArchived',
      transactions: 'id, userId, accountId, categoryId, type, occurredAt, createdAt, syncStatus, idempotencyKey',
      installmentPlans: 'id, userId, status',
      installments: 'id, planId, status, dueDate',
      budgets: 'id, userId, periodMonth, targetType',
      savingsGoals: 'id, userId, status',
      debts: 'id, userId, status',
      notifications: 'id, userId, read, createdAt',
      outbox: 'id, idempotencyKey, createdAt',
    });
  }
}

export const db = new FinoraDatabase();

export const DEFAULT_USER_ID = 'user-finora-local-01';

export const INITIAL_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt'>[] = [
  // Ingresos
  { name: 'Sueldo', group: 'income', icon: 'Briefcase', color: '#4ADE80', isArchived: false },
  { name: 'Changa / Freelance', group: 'income', icon: 'Hammer', color: '#4ADE80', isArchived: false },
  { name: 'Venta', group: 'income', icon: 'ShoppingBag', color: '#4ADE80', isArchived: false },
  { name: 'Comisión', group: 'income', icon: 'Percent', color: '#4ADE80', isArchived: false },
  { name: 'Ingreso Extraordinario', group: 'income', icon: 'Sparkles', color: '#4ADE80', isArchived: false },

  // Gastos Fijos
  { name: 'Alquiler', group: 'fixed_expense', icon: 'Home', color: '#FBBF24', isArchived: false },
  { name: 'Electricidad', group: 'fixed_expense', icon: 'Zap', color: '#FBBF24', isArchived: false },
  { name: 'Agua y Gas', group: 'fixed_expense', icon: 'Droplets', color: '#FBBF24', isArchived: false },
  { name: 'Internet y Conectividad', group: 'fixed_expense', icon: 'Wifi', color: '#FBBF24', isArchived: false },
  { name: 'Telefonía Móvil', group: 'fixed_expense', icon: 'Smartphone', color: '#FBBF24', isArchived: false },
  { name: 'Seguros', group: 'fixed_expense', icon: 'Shield', color: '#FBBF24', isArchived: false },
  { name: 'Cuotas Recurrentes', group: 'fixed_expense', icon: 'Calendar', color: '#FBBF24', isArchived: false },

  // Gastos Variables
  { name: 'Supermercado', group: 'variable_expense', icon: 'ShoppingCart', color: '#60A5FA', isArchived: false },
  { name: 'Transporte y SUBE', group: 'variable_expense', icon: 'Bus', color: '#60A5FA', isArchived: false },
  { name: 'Combustible', group: 'variable_expense', icon: 'Fuel', color: '#60A5FA', isArchived: false },
  { name: 'Salud y Farmacia', group: 'variable_expense', icon: 'Activity', color: '#60A5FA', isArchived: false },
  { name: 'Indumentaria', group: 'variable_expense', icon: 'Shirt', color: '#60A5FA', isArchived: false },
  { name: 'Educación y Cursos', group: 'variable_expense', icon: 'BookOpen', color: '#60A5FA', isArchived: false },
  { name: 'Mantenimiento Hogar/Auto', group: 'variable_expense', icon: 'Wrench', color: '#60A5FA', isArchived: false },

  // Gastos Hormiga
  { name: 'Café al paso', group: 'ant_expense', icon: 'Coffee', color: '#D8A4FF', isArchived: false },
  { name: 'Snacks y Kiosco', group: 'ant_expense', icon: 'Cookie', color: '#D8A4FF', isArchived: false },
  { name: 'Antojos y Delivery', group: 'ant_expense', icon: 'UtensilsCrossed', color: '#D8A4FF', isArchived: false },
  { name: 'Compras Pequeñas', group: 'ant_expense', icon: 'Tag', color: '#D8A4FF', isArchived: false },
  { name: 'Suscripciones Pequeñas', group: 'ant_expense', icon: 'Tv', color: '#D8A4FF', isArchived: false },

  // Ahorros y Deudas
  { name: 'Fondo de Emergencia', group: 'savings_debt', icon: 'ShieldCheck', color: '#FB7185', isArchived: false },
  { name: 'Ahorro Personal', group: 'savings_debt', icon: 'PiggyBank', color: '#FB7185', isArchived: false },
  { name: 'Cancelación de Deuda', group: 'savings_debt', icon: 'CheckCircle2', color: '#FB7185', isArchived: false },
  { name: 'Intereses y Cargos', group: 'savings_debt', icon: 'AlertTriangle', color: '#FB7185', isArchived: false },
];

export const INITIAL_ACCOUNTS: Omit<Account, 'id' | 'userId' | 'createdAt'>[] = [
  { name: 'Efectivo', type: 'cash', currency: 'ARS', initialBalance: 25000, currentBalance: 25000, isActive: true, color: '#4ADE80', icon: 'Banknote' },
  { name: 'Cuenta Bancaria Principal', type: 'bank', currency: 'ARS', initialBalance: 380000, currentBalance: 380000, isActive: true, color: '#5687F5', icon: 'Landmark' },
  { name: 'Billetera Virtual', type: 'digital_wallet', currency: 'ARS', initialBalance: 45000, currentBalance: 45000, isActive: true, color: '#60A5FA', icon: 'Wallet' },
  { name: 'Caja de Ahorro USD / Reserva', type: 'savings', currency: 'ARS', initialBalance: 150000, currentBalance: 150000, isActive: true, color: '#FB7185', icon: 'Vault' },
];

/**
 * Initializes the database with rich starter data if empty
 */
export async function seedDatabaseIfEmpty() {
  const profileCount = await db.profiles.count();
  if (profileCount > 0) return;

  const now = new Date().toISOString();

  // Create Profile
  await db.profiles.add({
    id: DEFAULT_USER_ID,
    email: 'marceloluisjara2005@gmail.com',
    displayName: 'Marcelo Jara',
    primaryCurrency: 'ARS',
    timezone: 'America/Argentina/Buenos_Aires',
    privacyModeEnabled: false,
    createdAt: now,
    updatedAt: now,
  });

  // Create Categories
  const categoryIdMap: Record<string, string> = {};
  for (const cat of INITIAL_CATEGORIES) {
    const id = `cat-${Math.random().toString(36).substr(2, 9)}`;
    categoryIdMap[cat.name] = id;
    await db.categories.add({
      ...cat,
      id,
      userId: DEFAULT_USER_ID,
      createdAt: now,
    });
  }

  // Create Accounts
  const accountIdMap: Record<string, string> = {};
  for (const acc of INITIAL_ACCOUNTS) {
    const id = `acc-${Math.random().toString(36).substr(2, 9)}`;
    accountIdMap[acc.name] = id;
    await db.accounts.add({
      ...acc,
      id,
      userId: DEFAULT_USER_ID,
      createdAt: now,
    });
  }

  const bankAccId = accountIdMap['Cuenta Bancaria Principal'];
  const walletAccId = accountIdMap['Billetera Virtual'];
  const cashAccId = accountIdMap['Efectivo'];

  // Seed Realistic Starter Transactions for the current month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const sampleTransactions: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'idempotencyKey' | 'syncStatus'>[] = [
    {
      accountId: bankAccId,
      categoryId: categoryIdMap['Sueldo'],
      type: 'income',
      amount: 850000,
      currency: 'ARS',
      description: 'Cobro de Sueldo Mensual',
      occurredAt: new Date(year, month, 1, 9, 30).toISOString(),
    },
    {
      accountId: bankAccId,
      categoryId: categoryIdMap['Alquiler'],
      type: 'expense',
      amount: 260000,
      currency: 'ARS',
      description: 'Alquiler Departamento',
      occurredAt: new Date(year, month, 3, 10, 0).toISOString(),
    },
    {
      accountId: bankAccId,
      categoryId: categoryIdMap['Electricidad'],
      type: 'expense',
      amount: 32000,
      currency: 'ARS',
      description: 'Factura Edenor',
      occurredAt: new Date(year, month, 5, 14, 20).toISOString(),
    },
    {
      accountId: walletAccId,
      categoryId: categoryIdMap['Supermercado'],
      type: 'expense',
      amount: 94500,
      currency: 'ARS',
      description: 'Compra Quincenal Coto',
      occurredAt: new Date(year, month, 6, 18, 45).toISOString(),
    },
    {
      accountId: walletAccId,
      categoryId: categoryIdMap['Café al paso'],
      type: 'expense',
      amount: 4200,
      currency: 'ARS',
      description: 'Café de Especialidad + Medialuna',
      occurredAt: new Date(year, month, 7, 8, 30).toISOString(),
    },
    {
      accountId: cashAccId,
      categoryId: categoryIdMap['Snacks y Kiosco'],
      type: 'expense',
      amount: 2800,
      currency: 'ARS',
      description: 'Agua mineral y alfajor',
      occurredAt: new Date(year, month, 8, 16, 15).toISOString(),
    },
    {
      accountId: bankAccId,
      categoryId: categoryIdMap['Internet y Conectividad'],
      type: 'expense',
      amount: 24000,
      currency: 'ARS',
      description: 'Abono Fibertel / Telecom',
      occurredAt: new Date(year, month, 10, 11, 0).toISOString(),
    },
    {
      accountId: walletAccId,
      categoryId: categoryIdMap['Transporte y SUBE'],
      type: 'expense',
      amount: 8500,
      currency: 'ARS',
      description: 'Recarga tarjeta SUBE',
      occurredAt: new Date(year, month, 12, 17, 10).toISOString(),
    },
  ];

  for (const t of sampleTransactions) {
    const id = `tx-${Math.random().toString(36).substr(2, 9)}`;
    await db.transactions.add({
      ...t,
      id,
      userId: DEFAULT_USER_ID,
      createdAt: t.occurredAt,
      updatedAt: t.occurredAt,
      idempotencyKey: id,
      syncStatus: 'synced',
    });
  }

  // Seed Budgets for current month
  const periodMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  await db.budgets.add({
    id: `bgt-general-${periodMonth}`,
    userId: DEFAULT_USER_ID,
    name: 'Presupuesto Mensual General',
    periodMonth,
    targetType: 'general',
    limitAmount: 600000,
    spentAmount: 426000,
    alertLevelTriggered: 70,
    createdAt: now,
  });

  await db.budgets.add({
    id: `bgt-super-${periodMonth}`,
    userId: DEFAULT_USER_ID,
    name: 'Supermercado y Alimentos',
    periodMonth,
    targetType: 'category',
    targetId: categoryIdMap['Supermercado'],
    limitAmount: 140000,
    spentAmount: 94500,
    alertLevelTriggered: 0,
    createdAt: now,
  });

  await db.budgets.add({
    id: `bgt-ant-${periodMonth}`,
    userId: DEFAULT_USER_ID,
    name: 'Límite de Gastos Hormiga',
    periodMonth,
    targetType: 'group',
    targetId: 'ant_expense',
    limitAmount: 25000,
    spentAmount: 7000,
    alertLevelTriggered: 0,
    createdAt: now,
  });

  // Seed Savings Goal
  await db.savingsGoals.add({
    id: `sg-${Math.random().toString(36).substr(2, 9)}`,
    userId: DEFAULT_USER_ID,
    name: 'Fondo de Emergencia (3 meses)',
    targetAmount: 1200000,
    currentAmount: 450000,
    targetDate: `${year}-12-31`,
    accountId: accountIdMap['Caja de Ahorro USD / Reserva'],
    icon: 'ShieldCheck',
    color: '#FB7185',
    status: 'in_progress',
    createdAt: now,
  });

  // Seed Installment Plan
  const planId = `plan-${Math.random().toString(36).substr(2, 9)}`;
  const totalAmount = 180000;
  const installmentsCount = 6;
  const amountPerInstallment = Math.round((totalAmount / installmentsCount) * 100) / 100;

  await db.installmentPlans.add({
    id: planId,
    userId: DEFAULT_USER_ID,
    description: 'Smart TV 50" 4K',
    totalAmount,
    installmentsCount,
    periodicity: 'monthly',
    firstDueDate: `${year}-${String(month + 1).padStart(2, '0')}-15`,
    categoryId: categoryIdMap['Cuotas Recurrentes'],
    accountId: bankAccId,
    status: 'active',
    createdAt: now,
  });

  for (let i = 1; i <= installmentsCount; i++) {
    const due = new Date(year, month + (i - 1), 15);
    const isPaid = i === 1;
    await db.installments.add({
      id: `inst-${planId}-${i}`,
      planId,
      installmentNumber: i,
      totalInstallments: installmentsCount,
      amount: amountPerInstallment,
      dueDate: due.toISOString().split('T')[0],
      status: isPaid ? 'paid' : i === 2 ? 'upcoming' : 'pending',
      paidDate: isPaid ? new Date(year, month, 15).toISOString() : undefined,
      paidAmount: isPaid ? amountPerInstallment : undefined,
    });
  }

  // Seed Notifications
  await db.notifications.add({
    id: `notif-1`,
    userId: DEFAULT_USER_ID,
    title: 'Bienvenido a Finora',
    message: 'Tu Contador Público Personal está listo para registrar y auditar tus finanzas.',
    type: 'info',
    read: false,
    createdAt: now,
  });

  await db.notifications.add({
    id: `notif-2`,
    userId: DEFAULT_USER_ID,
    title: 'Presupuesto Preventivo',
    message: 'Has utilizado el 71% de tu Presupuesto Mensual General.',
    type: 'warning',
    read: false,
    createdAt: now,
  });
}
