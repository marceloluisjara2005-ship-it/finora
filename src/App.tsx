/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { db, seedDatabaseIfEmpty, DEFAULT_USER_ID } from './lib/db';
import type {
  Account,
  Category,
  Transaction,
  Budget,
  InstallmentPlan,
  Installment,
  SavingsGoal,
  Debt,
  AppNotification,
  UserProfile,
  TransactionType,
} from './types/finance';
import { getCurrentMonthPeriod } from './lib/dates';
import { enqueueOutboxOperation, initBackgroundSyncListener } from './lib/sync';
import { getCurrentSession, signOut } from './lib/supabase';

// Components
import { Header } from './components/navigation/Header';
import { TabBar, type NavTab } from './components/navigation/TabBar';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { NotificationsModal } from './components/feedback/NotificationsModal';
import { TransactionFormModal } from './features/transactions/TransactionFormModal';
import { AuthModal } from './components/auth/AuthModal';
import { ViewSkeleton } from './components/ui/ViewSkeleton';

// Views
import { DashboardView } from './features/dashboard/DashboardView';

const TransactionsView = React.lazy(() =>
  import('./features/transactions/TransactionsView').then((m) => ({ default: m.TransactionsView }))
);
const StatsView = React.lazy(() =>
  import('./features/stats/StatsView').then((m) => ({ default: m.StatsView }))
);
const BudgetsView = React.lazy(() =>
  import('./features/budgets/BudgetsView').then((m) => ({ default: m.BudgetsView }))
);
const ProfileView = React.lazy(() =>
  import('./features/profile/ProfileView').then((m) => ({ default: m.ProfileView }))
);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentPeriod, setCurrentPeriod] = useState<string>(getCurrentMonthPeriod());
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCloudSession, setIsCloudSession] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Financial Domain State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reload all records from IndexedDB
  const reloadData = useCallback(async () => {
    try {
      const allProfiles = await db.profiles.toArray();
      const p = allProfiles[0] || (await db.profiles.get(DEFAULT_USER_ID));
      const accList = await db.accounts.toArray();
      const catList = await db.categories.toArray();
      const txList = await db.transactions.toArray();
      const bgtList = await db.budgets.toArray();
      const planList = await db.installmentPlans.toArray();
      const instList = await db.installments.toArray();
      const sgList = await db.savingsGoals.toArray();
      const debtList = await db.debts.toArray();
      const notifList = await db.notifications.orderBy('createdAt').reverse().toArray();

      if (p) {
        setProfile(p);
        setPrivacyMode(p.privacyModeEnabled || false);
      }
      setAccounts(accList);
      setCategories(catList);
      setTransactions(txList);
      setBudgets(bgtList);
      setInstallmentPlans(planList);
      setInstallments(instList);
      setSavingsGoals(sgList);
      setDebts(debtList);
      setNotifications(notifList);
    } catch (err) {
      console.error('Error loading data from Dexie:', err);
    }
  }, []);

  // Initialization
  useEffect(() => {
    async function init() {
      try {
        await seedDatabaseIfEmpty();
        await reloadData();

        // Check if there is an active Supabase Auth session
        const { session, user } = await getCurrentSession();
        if (session && user) {
          setIsCloudSession(true);
          const cloudProfile: UserProfile = {
            id: user.id,
            email: user.email || 'usuario@finora.app',
            displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario Finora',
            primaryCurrency: 'ARS',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires',
            privacyModeEnabled: false,
            createdAt: user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setProfile(cloudProfile);
          await db.profiles.put(cloudProfile);
        } else {
          // If no active cloud session and first time without choice, show auth modal
          const hasGuestChoice = localStorage.getItem('finora_guest_mode');
          if (!hasGuestChoice) {
            setIsAuthOpen(true);
          }
        }
      } catch (err) {
        console.error('Error during init:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();

    // Background sync listener on network reconnect
    const cleanupSync = initBackgroundSyncListener(async (result) => {
      await reloadData();
      showToast(`Sincronización completada: ${result.syncedCount} movimiento(s) sincronizados.`);
    });

    return () => {
      cleanupSync();
    };
  }, [reloadData]);

  // Toggle Privacy Mode
  const handleTogglePrivacy = async () => {
    const nextVal = !privacyMode;
    setPrivacyMode(nextVal);
    if (profile) {
      await db.profiles.update(profile.id, { privacyModeEnabled: nextVal });
    }
  };

  // Auth Handlers
  const handleAuthSuccess = async (userProf: UserProfile, isCloud: boolean) => {
    setIsCloudSession(isCloud);
    setProfile(userProf);
    localStorage.setItem('finora_guest_mode', 'true');
    await db.profiles.put(userProf);
    setIsAuthOpen(false);
    showToast(
      isCloud
        ? `¡Bienvenido ${userProf.displayName}! Sesión iniciada con Supabase.`
        : `Perfil local guardado.`
    );
    await reloadData();
  };

  const handleSignOut = async () => {
    await signOut();
    setIsCloudSession(false);
    localStorage.removeItem('finora_guest_mode');
    showToast('Sesión de Supabase cerrada.');
    setIsAuthOpen(true);
  };

  const handleContinueOfflineGuest = () => {
    localStorage.setItem('finora_guest_mode', 'true');
    setIsAuthOpen(false);
    showToast('Ingresaste en modo local sin conexión.');
  };

  // 1. Transaction Creation Handler
  const handleCreateTransaction = async (data: {
    type: TransactionType;
    amount: number;
    description: string;
    accountId: string;
    categoryId?: string;
    occurredAt: string;
    notes?: string;
    isInstallment?: boolean;
    installmentsCount?: number;
    destinationAccountId?: string;
  }) => {
    const nowIso = new Date().toISOString();
    const txId = `tx-${Math.random().toString(36).substr(2, 9)}`;

    // A. Handle Transfer
    if (data.type === 'transfer' && data.destinationAccountId) {
      const srcAcc = await db.accounts.get(data.accountId);
      const destAcc = await db.accounts.get(data.destinationAccountId);

      if (srcAcc && destAcc) {
        await db.accounts.update(srcAcc.id, { currentBalance: srcAcc.currentBalance - data.amount });
        await db.accounts.update(destAcc.id, { currentBalance: destAcc.currentBalance + data.amount });
      }

      await db.transactions.add({
        id: txId,
        userId: DEFAULT_USER_ID,
        accountId: data.accountId,
        transferDestinationAccountId: data.destinationAccountId,
        type: 'transfer',
        amount: data.amount,
        currency: 'ARS',
        description: data.description,
        notes: data.notes,
        occurredAt: data.occurredAt,
        createdAt: nowIso,
        updatedAt: nowIso,
        idempotencyKey: txId,
        syncStatus: 'synced',
      });

      showToast('Transferencia entre cuentas realizada con éxito.');
      await reloadData();
      return;
    }

    // B. Handle Installment Plan
    if (data.type === 'expense' && data.isInstallment && data.installmentsCount && data.installmentsCount > 1) {
      const planId = `plan-${Math.random().toString(36).substr(2, 9)}`;
      const count = data.installmentsCount;
      const baseAmount = Math.floor((data.amount * 100) / count) / 100;
      const remainder = Math.round((data.amount - baseAmount * count) * 100) / 100;

      await db.installmentPlans.add({
        id: planId,
        userId: DEFAULT_USER_ID,
        description: data.description,
        totalAmount: data.amount,
        installmentsCount: count,
        periodicity: 'monthly',
        firstDueDate: data.occurredAt.split('T')[0],
        categoryId: data.categoryId || '',
        accountId: data.accountId,
        notes: data.notes,
        status: 'active',
        createdAt: nowIso,
      });

      const [year, month, day] = data.occurredAt.split('T')[0].split('-').map(Number);

      for (let i = 1; i <= count; i++) {
        // Last installment gets the remainder cents
        const instAmount = i === count ? baseAmount + remainder : baseAmount;
        const due = new Date(year, month - 1 + (i - 1), day);

        await db.installments.add({
          id: `inst-${planId}-${i}`,
          planId,
          installmentNumber: i,
          totalInstallments: count,
          amount: instAmount,
          dueDate: due.toISOString().split('T')[0],
          status: 'pending',
        });
      }

      showToast(`Plan de ${count} cuotas registrado exitosamente.`);
      await reloadData();
      return;
    }

    // C. Standard Income or Expense
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const syncStatus = isOnline ? 'synced' : 'pending_sync';

    const acc = await db.accounts.get(data.accountId);
    if (acc) {
      const newBal = data.type === 'income' ? acc.currentBalance + data.amount : acc.currentBalance - data.amount;
      await db.accounts.update(acc.id, { currentBalance: newBal });
    }

    const newTx: Transaction = {
      id: txId,
      userId: DEFAULT_USER_ID,
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      currency: profile?.primaryCurrency || 'ARS',
      description: data.description,
      notes: data.notes,
      occurredAt: data.occurredAt,
      createdAt: nowIso,
      updatedAt: nowIso,
      idempotencyKey: txId,
      syncStatus,
    };

    await db.transactions.add(newTx);

    if (!isOnline) {
      await enqueueOutboxOperation('create_transaction', newTx, txId);
    }

    // Check budget thresholds for alerts if expense
    if (data.type === 'expense') {
      const txMonth = data.occurredAt.slice(0, 7);
      const activeBudgets = await db.budgets.where('periodMonth').equals(txMonth).toArray();

      for (const b of activeBudgets) {
        let matches = false;
        if (b.targetType === 'general') matches = true;
        else if (b.targetType === 'category' && b.targetId === data.categoryId) matches = true;
        else if (b.targetType === 'group') {
          const cat = categories.find((c) => c.id === data.categoryId);
          if (cat && cat.group === b.targetId) matches = true;
        }

        if (matches) {
          const newSpent = b.spentAmount + data.amount;
          await db.budgets.update(b.id, { spentAmount: newSpent });

          const percent = Math.round((newSpent / b.limitAmount) * 100);
          let alertTrigger = 0;
          if (percent >= 100 && b.alertLevelTriggered < 100) alertTrigger = 100;
          else if (percent >= 90 && b.alertLevelTriggered < 90) alertTrigger = 90;
          else if (percent >= 70 && b.alertLevelTriggered < 70) alertTrigger = 70;

          if (alertTrigger > 0) {
            await db.budgets.update(b.id, { alertLevelTriggered: alertTrigger });
            await db.notifications.add({
              id: `notif-${Math.random().toString(36).substr(2, 9)}`,
              userId: DEFAULT_USER_ID,
              title: alertTrigger >= 100 ? '¡Presupuesto Superado!' : `Alerta de Presupuesto ${alertTrigger}%`,
              message: `Has utilizado el ${percent}% de tu presupuesto «${b.name}».`,
              type: alertTrigger >= 100 ? 'error' : 'warning',
              read: false,
              createdAt: nowIso,
            });
          }
        }
      }
    }

    showToast('Movimiento registrado correctamente.');
    await reloadData();
  };

  // 2. Transaction Deletion Handler
  const handleDeleteTransaction = async (id: string) => {
    const tx = await db.transactions.get(id);
    if (!tx) return;

    // Reverse account balance
    const acc = await db.accounts.get(tx.accountId);
    if (acc) {
      const reversedBalance =
        tx.type === 'income' ? acc.currentBalance - tx.amount : acc.currentBalance + tx.amount;
      await db.accounts.update(acc.id, { currentBalance: reversedBalance });
    }

    await db.transactions.delete(id);
    showToast('Movimiento eliminado correctamente.');
    await reloadData();
  };

  // 3. Add Budget Handler
  const handleAddBudget = async (data: {
    name: string;
    periodMonth: string;
    targetType: 'general' | 'category' | 'group';
    targetId?: string;
    limitAmount: number;
  }) => {
    const nowIso = new Date().toISOString();
    const id = `bgt-${Math.random().toString(36).substr(2, 9)}`;

    // Compute spent from existing transactions in that month
    const monthTx = transactions.filter((t) => t.occurredAt.startsWith(data.periodMonth) && t.type === 'expense');
    let spent = 0;
    for (const t of monthTx) {
      if (data.targetType === 'general') spent += t.amount;
      else if (data.targetType === 'category' && t.categoryId === data.targetId) spent += t.amount;
      else if (data.targetType === 'group') {
        const cat = categories.find((c) => c.id === t.categoryId);
        if (cat && cat.group === data.targetId) spent += t.amount;
      }
    }

    await db.budgets.add({
      id,
      userId: DEFAULT_USER_ID,
      ...data,
      spentAmount: spent,
      alertLevelTriggered: 0,
      createdAt: nowIso,
    });

    showToast('Presupuesto configurado con éxito.');
    await reloadData();
  };

  // 4. Pay Installment Handler
  const handlePayInstallment = async (installmentId: string) => {
    const inst = await db.installments.get(installmentId);
    if (!inst) return;

    const plan = await db.installmentPlans.get(inst.planId);
    const nowIso = new Date().toISOString();
    const txId = `tx-${Math.random().toString(36).substr(2, 9)}`;

    // Update installment
    await db.installments.update(installmentId, {
      status: 'paid',
      paidDate: nowIso,
      paidAmount: inst.amount,
      transactionId: txId,
    });

    // Create payment transaction
    if (plan) {
      await db.transactions.add({
        id: txId,
        userId: DEFAULT_USER_ID,
        accountId: plan.accountId,
        categoryId: plan.categoryId,
        type: 'expense',
        amount: inst.amount,
        currency: 'ARS',
        description: `Pago Cuota ${inst.installmentNumber}/${inst.totalInstallments}: ${plan.description}`,
        occurredAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        idempotencyKey: txId,
        syncStatus: 'synced',
        installmentPlanId: plan.id,
        installmentNumber: inst.installmentNumber,
      });

      // Deduct account balance
      const acc = await db.accounts.get(plan.accountId);
      if (acc) {
        await db.accounts.update(acc.id, { currentBalance: acc.currentBalance - inst.amount });
      }
    }

    showToast(`Cuota #${inst.installmentNumber} abonada con éxito.`);
    await reloadData();
  };

  // 5. Add Account Handler
  const handleAddAccount = async (acc: Omit<Account, 'id' | 'userId' | 'createdAt'>) => {
    const id = `acc-${Math.random().toString(36).substr(2, 9)}`;
    await db.accounts.add({
      ...acc,
      id,
      userId: DEFAULT_USER_ID,
      createdAt: new Date().toISOString(),
    });
    showToast('Cuenta agregada exitosamente.');
    await reloadData();
  };

  // 6. Add Savings Goal Handler
  const handleAddSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'currentAmount' | 'status'>) => {
    const id = `sg-${Math.random().toString(36).substr(2, 9)}`;
    await db.savingsGoals.add({
      ...goal,
      id,
      userId: DEFAULT_USER_ID,
      currentAmount: 0,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    });
    showToast('Meta de ahorro creada con éxito.');
    await reloadData();
  };

  // 7. Contribute to Savings Goal
  const handleContributeSavings = async (goalId: string, amount: number) => {
    const goal = await db.savingsGoals.get(goalId);
    if (!goal) return;

    const nowIso = new Date().toISOString();
    const newCurrent = goal.currentAmount + amount;
    const isCompleted = newCurrent >= goal.targetAmount;

    await db.savingsGoals.update(goalId, {
      currentAmount: newCurrent,
      status: isCompleted ? 'completed' : 'in_progress',
    });

    // Record savings deposit transaction
    const txId = `tx-${Math.random().toString(36).substr(2, 9)}`;
    const acc = accounts[0]; // Primary account
    if (acc) {
      await db.accounts.update(acc.id, { currentBalance: acc.currentBalance - amount });
      await db.transactions.add({
        id: txId,
        userId: DEFAULT_USER_ID,
        accountId: acc.id,
        type: 'savings_deposit',
        amount,
        currency: 'ARS',
        description: `Aporte a Meta: ${goal.name}`,
        occurredAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        idempotencyKey: txId,
        syncStatus: 'synced',
        savingsGoalId: goalId,
      });
    }

    showToast(isCompleted ? '🎉 ¡Felicidades! Has alcanzado tu meta de ahorro.' : 'Aporte a tu meta registrado con éxito.');
    await reloadData();
  };

  // 7b. Add Category Handler
  const handleAddCategory = async (cat: Omit<Category, 'id' | 'userId' | 'createdAt'>) => {
    const id = `cat-${Math.random().toString(36).substr(2, 9)}`;
    await db.categories.add({
      ...cat,
      id,
      userId: DEFAULT_USER_ID,
      createdAt: new Date().toISOString(),
    });
    showToast('Categoría creada exitosamente.');
    await reloadData();
  };

  // 7c. Archive Category Handler
  const handleArchiveCategory = async (id: string) => {
    await db.categories.update(id, { isArchived: true });
    showToast('Categoría archivada.');
    await reloadData();
  };

  // 7d. Add Debt Handler
  const handleAddDebt = async (debt: Omit<Debt, 'id' | 'userId' | 'createdAt' | 'status'>) => {
    const id = `debt-${Math.random().toString(36).substr(2, 9)}`;
    await db.debts.add({
      ...debt,
      id,
      userId: DEFAULT_USER_ID,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    showToast('Deuda registrada.');
    await reloadData();
  };

  // 7e. Pay Debt Handler
  const handlePayDebt = async (debtId: string, amount: number, accountId: string) => {
    const d = await db.debts.get(debtId);
    if (!d) return;

    const acc = await db.accounts.get(accountId);
    if (!acc) return;

    const nowIso = new Date().toISOString();
    const newRem = Math.max(0, d.remainingCapital - amount);
    const isFullyPaid = newRem <= 0;

    await db.debts.update(debtId, {
      remainingCapital: newRem,
      status: isFullyPaid ? 'paid' : 'active',
    });

    // Deduct account balance
    await db.accounts.update(acc.id, { currentBalance: acc.currentBalance - amount });

    // Record debt payment transaction
    const txId = `tx-${Math.random().toString(36).substr(2, 9)}`;
    await db.transactions.add({
      id: txId,
      userId: DEFAULT_USER_ID,
      accountId: acc.id,
      type: 'debt_payment',
      amount,
      currency: profile?.primaryCurrency || 'ARS',
      description: `Pago Deuda: ${d.creditorName}`,
      occurredAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      idempotencyKey: txId,
      syncStatus: 'synced',
      debtId,
    });

    showToast(isFullyPaid ? '🎉 ¡Deuda totalmente cancelada!' : 'Pago de deuda registrado.');
    await reloadData();
  };

  // 7f. Update Profile Handler
  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    if (!profile) return;
    await db.profiles.update(profile.id, {
      ...updated,
      updatedAt: new Date().toISOString(),
    });
    showToast('Perfil actualizado correctamente.');
    await reloadData();
  };

  // 8. Ask Gemini Server Endpoint
  const handleAskGemini = async (prompt: string): Promise<string> => {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      throw new Error('Error al conectar con el servidor contable.');
    }

    const data = await res.json();
    return data.reply;
  };

  // 9. Reset database to initial seed
  const handleResetData = async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
    await reloadData();
    showToast('Base de datos restablecida a valores semilla.');
  };

  // Notifications management
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const handleMarkNotificationRead = async (id: string) => {
    await db.notifications.update(id, { read: true });
    await reloadData();
  };

  const handleClearAllNotifications = async () => {
    await db.notifications.clear();
    await reloadData();
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-[#080B12] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#5687F5] flex items-center justify-center text-white text-xl font-bold animate-pulse shadow-[0_0_30px_rgba(86,135,245,0.6)]">
          F
        </div>
        <p className="text-xs text-[#929BAD] mt-4 font-medium tracking-wide">Cargando Finora...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B12] text-[#F5F7FC] flex flex-col selection:bg-[#5687F5] selection:text-white">
      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-4 z-50 max-w-sm mx-auto p-3 rounded-2xl bg-[#171D2B]/95 backdrop-blur-md border border-[#5687F5]/50 shadow-2xl text-xs font-semibold text-[#F5F7FC] text-center animate-in slide-in-from-top duration-300">
          {toastMessage}
        </div>
      )}

      {/* iOS Status Bar and App Header */}
      <Header
        currentPeriod={currentPeriod}
        onChangePeriod={setCurrentPeriod}
        privacyMode={privacyMode}
        onTogglePrivacy={handleTogglePrivacy}
        unreadCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        userEmail={profile?.email}
        isCloudSession={isCloudSession}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main View Port Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3">
        <React.Suspense fallback={<ViewSkeleton />}>
          {activeTab === 'dashboard' && (
            <DashboardView
              currentPeriod={currentPeriod}
              privacyMode={privacyMode}
              accounts={accounts}
              categories={categories}
              transactions={transactions}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onNavigateToTransactions={() => setActiveTab('transactions')}
              onNavigateToStats={() => setActiveTab('stats')}
              onNavigateToBudgets={() => setActiveTab('budgets')}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              privacyMode={privacyMode}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          )}

          {activeTab === 'stats' && (
            <StatsView
              currentPeriod={currentPeriod}
              transactions={transactions}
              categories={categories}
              privacyMode={privacyMode}
              onAskGemini={handleAskGemini}
              currency={profile?.primaryCurrency || 'ARS'}
              userName={profile?.displayName}
              userEmail={profile?.email}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsView
              currentPeriod={currentPeriod}
              budgets={budgets}
              categories={categories}
              installmentPlans={installmentPlans}
              installments={installments}
              privacyMode={privacyMode}
              onAddBudget={handleAddBudget}
              onPayInstallment={handlePayInstallment}
              currency={profile?.primaryCurrency || 'ARS'}
              onRefreshNotifications={reloadData}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              profile={profile}
              accounts={accounts}
              categories={categories}
              savingsGoals={savingsGoals}
              debts={debts}
              privacyMode={privacyMode}
              isCloudSession={isCloudSession}
              onOpenAuth={() => setIsAuthOpen(true)}
              onSignOut={handleSignOut}
              onAddAccount={handleAddAccount}
              onAddSavingsGoal={handleAddSavingsGoal}
              onContributeSavings={handleContributeSavings}
              onAddCategory={handleAddCategory}
              onArchiveCategory={handleArchiveCategory}
              onAddDebt={handleAddDebt}
              onPayDebt={handlePayDebt}
              onUpdateProfile={handleUpdateProfile}
              onAskGemini={handleAskGemini}
              onResetData={handleResetData}
            />
          )}
        </React.Suspense>
      </main>

      {/* Supabase Authentication & Account Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        canDismiss={Boolean(profile)}
        onAuthSuccess={handleAuthSuccess}
        onContinueOfflineGuest={handleContinueOfflineGuest}
      />

      {/* Floating Bottom Sheet for Transaction Registration */}
      <TransactionFormModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        accounts={accounts}
        categories={categories}
        onSubmit={handleCreateTransaction}
      />

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationRead}
        onClearAll={handleClearAllNotifications}
      />

      {/* iOS 5-Tab Bottom Navigation Bar */}
      <TabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />
    </div>
  );
}
