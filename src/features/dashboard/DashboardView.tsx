import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  PlusCircle,
  ArrowRight,
  Flame,
  Coffee,
  CheckCircle2,
  Calendar,
  Sparkles,
  FileText,
  X,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { Account, Category, Transaction } from '../../types/finance';
import { formatCurrency } from '../../lib/currency';
import { formatDateTime, getPreviousMonth, formatMonthLabel } from '../../lib/dates';
import { CategoryIcon } from '../../components/ui/CategoryIcon';

interface DashboardViewProps {
  currentPeriod: string;
  privacyMode: boolean;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  onOpenQuickAdd: () => void;
  onNavigateToTransactions: () => void;
  onNavigateToStats: () => void;
  onNavigateToBudgets: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentPeriod,
  privacyMode,
  accounts,
  categories,
  transactions,
  onOpenQuickAdd,
  onNavigateToTransactions,
  onNavigateToStats,
  onNavigateToBudgets,
}) => {
  // Category map for quick lookup
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Account map
  const accountMap = React.useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Filter transactions by selected month (YYYY-MM)
  const periodTransactions = React.useMemo(() => {
    return transactions.filter((t) => t.occurredAt.startsWith(currentPeriod));
  }, [transactions, currentPeriod]);

  // Financial aggregates
  const totals = React.useMemo(() => {
    let income = 0;
    let expense = 0;
    let fixedExpense = 0;
    let variableExpense = 0;
    let antExpense = 0;
    let savingsAport = 0;

    for (const t of periodTransactions) {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expense += t.amount;
        const cat = t.categoryId ? categoryMap.get(t.categoryId) : undefined;
        if (cat) {
          if (cat.group === 'fixed_expense') fixedExpense += t.amount;
          else if (cat.group === 'variable_expense') variableExpense += t.amount;
          else if (cat.group === 'ant_expense') antExpense += t.amount;
        } else {
          variableExpense += t.amount;
        }
      } else if (t.type === 'savings_deposit') {
        savingsAport += t.amount;
      }
    }

    // Available cash balance across all active accounts
    const totalLiquidCash = accounts
      .filter((a) => a.isActive && a.type !== 'savings')
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const totalSavingsVault = accounts
      .filter((a) => a.isActive && a.type === 'savings')
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const netPeriodBalance = income - expense;

    return {
      income,
      expense,
      fixedExpense,
      variableExpense,
      antExpense,
      savingsAport,
      totalLiquidCash,
      totalSavingsVault,
      netPeriodBalance,
    };
  }, [periodTransactions, accounts, categoryMap]);

  // Expenses by Category Donut Data
  const chartData = React.useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();

    for (const t of periodTransactions) {
      if (t.type === 'expense' && t.categoryId) {
        const cat = categoryMap.get(t.categoryId);
        const name = cat ? cat.name : 'Varios';
        const color = cat ? cat.color : '#60A5FA';
        const existing = map.get(name) || { name, value: 0, color };
        existing.value += t.amount;
        map.set(name, existing);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [periodTransactions, categoryMap]);

  // Last 10 transactions
  const recentTransactions = React.useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 10);
  }, [transactions]);

  const [isReportBannerDismissed, setIsReportBannerDismissed] = useState(false);
  const prevMonth = getPreviousMonth(currentPeriod);

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-300">
      {/* Monthly Report Recommendation Banner */}
      {!isReportBannerDismissed && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#171D2B] to-[#101522] border border-[#5687F5]/40 shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#5687F5]/20 flex items-center justify-center flex-shrink-0 text-[#5687F5]">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#F5F7FC] block truncate">
                Informe contable de {formatMonthLabel(prevMonth)} disponible
              </span>
              <p className="text-[10px] text-[#929BAD] truncate">
                Consulta el resumen de cierre y auditoría de tu período anterior.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onNavigateToStats}
              className="px-2.5 py-1.5 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] active:scale-95 text-white text-[11px] font-semibold transition-all shadow-sm"
            >
              Consultar
            </button>
            <button
              onClick={() => setIsReportBannerDismissed(true)}
              className="p-1 rounded-lg text-[#929BAD] hover:text-[#F5F7FC] transition-colors"
              title="Descartar recomendación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Main Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#171D2B] to-[#101522] border border-[#262E3D] p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#929BAD] uppercase tracking-wider">
            Balance del Período
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
              totals.netPeriodBalance >= 0
                ? 'bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30'
                : 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30'
            }`}
          >
            {totals.netPeriodBalance >= 0 ? '+ Superávit' : 'Déficit'}
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-[#F5F7FC]">
            {formatCurrency(totals.netPeriodBalance, 'ARS', privacyMode)}
          </span>
        </div>

        {/* Income vs Expenses quick bar */}
        <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-[#262E3D]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4ADE80]/15 flex items-center justify-center text-[#4ADE80]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-[#929BAD] block">Ingresos</span>
              <span className="text-sm font-semibold text-[#4ADE80]">
                {formatCurrency(totals.income, 'ARS', privacyMode)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F87171]/15 flex items-center justify-center text-[#F87171]">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-[#929BAD] block">Gastos</span>
              <span className="text-sm font-semibold text-[#F87171]">
                {formatCurrency(totals.expense, 'ARS', privacyMode)}
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Account Available Assets */}
        <div className="mt-4 p-3 rounded-2xl bg-[#080B12]/60 border border-[#262E3D]/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#5687F5]" />
            <span className="text-[#929BAD]">Dinero Disponible:</span>
          </div>
          <span className="font-semibold text-[#F5F7FC]">
            {formatCurrency(totals.totalLiquidCash, 'ARS', privacyMode)}
          </span>
        </div>
      </div>

      {/* 2. Financial Breakdown Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#929BAD]">
            Distribución Financiera
          </h3>
          <button
            onClick={onNavigateToStats}
            className="text-xs text-[#5687F5] hover:underline flex items-center gap-1 font-medium"
          >
            <span>Ver reporte</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Gastos Fijos */}
          <div className="p-3.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] hover:border-[#FBBF24]/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[#929BAD]">Gastos Fijos</span>
              <span className="w-2 h-2 rounded-full bg-[#FBBF24]" />
            </div>
            <span className="text-sm font-bold text-[#F5F7FC] block">
              {formatCurrency(totals.fixedExpense, 'ARS', privacyMode)}
            </span>
            <span className="text-[10px] text-[#929BAD] mt-0.5 block">Alquiler, servicios</span>
          </div>

          {/* Gastos Variables */}
          <div className="p-3.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] hover:border-[#60A5FA]/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[#929BAD]">Gastos Variables</span>
              <span className="w-2 h-2 rounded-full bg-[#60A5FA]" />
            </div>
            <span className="text-sm font-bold text-[#F5F7FC] block">
              {formatCurrency(totals.variableExpense, 'ARS', privacyMode)}
            </span>
            <span className="text-[10px] text-[#929BAD] mt-0.5 block">Súper, transporte</span>
          </div>

          {/* Gastos Hormiga */}
          <div className="p-3.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] hover:border-[#D8A4FF]/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[#929BAD]">Gastos Hormiga</span>
              <span className="w-2 h-2 rounded-full bg-[#D8A4FF]" />
            </div>
            <span className="text-sm font-bold text-[#D8A4FF] block">
              {formatCurrency(totals.antExpense, 'ARS', privacyMode)}
            </span>
            <span className="text-[10px] text-[#929BAD] mt-0.5 block">Café, golosinas</span>
          </div>

          {/* Ahorros en Reserva */}
          <div className="p-3.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] hover:border-[#FB7185]/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[#929BAD]">Ahorro Total</span>
              <span className="w-2 h-2 rounded-full bg-[#FB7185]" />
            </div>
            <span className="text-sm font-bold text-[#FB7185] block">
              {formatCurrency(totals.totalSavingsVault, 'ARS', privacyMode)}
            </span>
            <span className="text-[10px] text-[#929BAD] mt-0.5 block">Fondos y metas</span>
          </div>
        </div>
      </div>

      {/* 3. Donut Category Breakdown & Fast Insights */}
      {chartData.length > 0 && (
        <div className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#929BAD] mb-2">
            Principales Categorías de Gasto
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#171D2B" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value) || 0, 'ARS', privacyMode), 'Gasto']}
                    contentStyle={{
                      backgroundColor: '#101522',
                      borderColor: '#262E3D',
                      borderRadius: '16px',
                      color: '#F5F7FC',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {chartData.map((item) => {
                const percent = totals.expense > 0 ? Math.round((item.value / totals.expense) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[#F5F7FC] font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#929BAD] text-[11px]">{percent}%</span>
                      <span className="font-semibold text-[#F5F7FC]">
                        {formatCurrency(item.value, 'ARS', privacyMode)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Recent Transactions List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#929BAD]">
            Últimos Movimientos
          </h3>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs text-[#5687F5] hover:underline flex items-center gap-1 font-medium"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {recentTransactions.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#171D2B] border border-[#262E3D] text-center text-[#929BAD]">
              <p className="text-sm">Aún no hay movimientos registrados.</p>
              <button
                onClick={onOpenQuickAdd}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5687F5] text-white text-xs font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Primer Movimiento</span>
              </button>
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
              const acc = accountMap.get(tx.accountId);
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-[#171D2B] border border-[#262E3D] flex items-center justify-between hover:border-[#262E3D]/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: cat ? `${cat.color}20` : '#5687F520',
                      }}
                    >
                      <CategoryIcon
                        name={cat ? cat.icon : isTransfer ? 'ArrowLeftRight' : 'CreditCard'}
                        color={cat ? cat.color : '#5687F5'}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-[#F5F7FC] truncate">
                        {tx.description}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#929BAD]">
                        <span>{cat ? cat.name : isTransfer ? 'Transferencia' : 'General'}</span>
                        <span>•</span>
                        <span>{formatDateTime(tx.occurredAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <span
                      className={`text-xs font-bold ${
                        isIncome
                          ? 'text-[#4ADE80]'
                          : isTransfer
                          ? 'text-[#60A5FA]'
                          : 'text-[#F5F7FC]'
                      }`}
                    >
                      {isIncome ? '+' : isTransfer ? '' : '-'}
                      {formatCurrency(tx.amount, 'ARS', privacyMode)}
                    </span>
                    <span className="block text-[10px] text-[#929BAD] truncate max-w-[80px]">
                      {acc ? acc.name : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
