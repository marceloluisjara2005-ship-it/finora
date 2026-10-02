import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Trash2,
  FileDown,
  Filter,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
} from 'lucide-react';
import type { Account, Category, Transaction, FinancialGroup } from '../../types/finance';
import { formatCurrency } from '../../lib/currency';
import { formatDateTime } from '../../lib/dates';
import { CategoryIcon } from '../../components/ui/CategoryIcon';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  privacyMode: boolean;
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenQuickAdd: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  accounts,
  privacyMode,
  onDeleteTransaction,
  onOpenQuickAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Filtered transactions
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      // Search text
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(term);
        const cat = t.categoryId ? categoryMap.get(t.categoryId) : undefined;
        const catMatch = cat?.name.toLowerCase().includes(term);
        const notesMatch = t.notes?.toLowerCase().includes(term);
        if (!descMatch && !catMatch && !notesMatch) return false;
      }

      // Account filter
      if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) {
        return false;
      }

      // Group filter
      if (selectedGroup !== 'all') {
        if (selectedGroup === 'income') return t.type === 'income';
        if (selectedGroup === 'transfer') return t.type === 'transfer';
        const cat = t.categoryId ? categoryMap.get(t.categoryId) : undefined;
        if (cat?.group !== selectedGroup) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [transactions, searchTerm, selectedAccountId, selectedGroup, categoryMap]);

  // Filter totals
  const filterStats = useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    for (const t of filteredList) {
      if (t.type === 'income') incomeSum += t.amount;
      else if (t.type === 'expense') expenseSum += t.amount;
    }
    return { count: filteredList.length, incomeSum, expenseSum, net: incomeSum - expenseSum };
  }, [filteredList]);

  // CSV Export
  const exportToCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cuenta', 'Importe', 'Moneda', 'Notas'];
    const rows = filteredList.map((t) => {
      const cat = t.categoryId ? categoryMap.get(t.categoryId)?.name : 'Sin categoría';
      const acc = accountMap.get(t.accountId)?.name || 'Cuenta';
      return [
        t.id,
        t.occurredAt,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${cat}"`,
        `"${acc}"`,
        t.amount,
        t.currency,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finora_movimientos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      {/* Search and Filters Header */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#929BAD]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descripción, comercio, notas..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] placeholder:text-[#929BAD]/60 focus:outline-none focus:border-[#5687F5]"
          />
        </div>

        {/* Filter Pills Horizontal Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'income', label: 'Ingresos' },
            { id: 'fixed_expense', label: 'Gastos Fijos' },
            { id: 'variable_expense', label: 'Variables' },
            { id: 'ant_expense', label: 'Hormiga' },
            { id: 'transfer', label: 'Transferencias' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedGroup(pill.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                selectedGroup === pill.id
                  ? 'bg-[#5687F5] text-white shadow-sm'
                  : 'bg-[#171D2B] text-[#929BAD] border border-[#262E3D] hover:text-[#F5F7FC]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Account and Export Row */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#171D2B] border border-[#262E3D] text-[#F5F7FC] text-xs focus:outline-none focus:border-[#5687F5]"
          >
            <option value="all">Todas las cuentas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171D2B] hover:bg-[#202738] border border-[#262E3D] text-[#929BAD] hover:text-[#F5F7FC] font-medium transition-colors"
            title="Exportar a archivo CSV"
          >
            <FileDown className="w-3.5 h-3.5 text-[#5687F5]" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Statistics Banner */}
      <div className="p-3 rounded-2xl bg-[#101522] border border-[#262E3D] flex items-center justify-between text-xs">
        <span className="text-[#929BAD]">
          <strong className="text-[#F5F7FC]">{filterStats.count}</strong> movimientos filtrados
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[#4ADE80] font-semibold">
            +{formatCurrency(filterStats.incomeSum, 'ARS', privacyMode)}
          </span>
          <span className="text-[#F87171] font-semibold">
            -{formatCurrency(filterStats.expenseSum, 'ARS', privacyMode)}
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filteredList.length === 0 ? (
          <div className="py-16 text-center text-[#929BAD] bg-[#171D2B] rounded-3xl border border-[#262E3D] p-6">
            <Filter className="w-8 h-8 mx-auto mb-2 text-[#929BAD]/50" />
            <p className="text-sm font-medium">No hay movimientos que coincidan con la búsqueda</p>
            <p className="text-xs text-[#929BAD]/70 mt-1">Prueba cambiando los filtros o registra uno nuevo.</p>
            <button
              onClick={onOpenQuickAdd}
              className="mt-4 px-4 py-2 rounded-xl bg-[#5687F5] text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Movimiento</span>
            </button>
          </div>
        ) : (
          filteredList.map((tx) => {
            const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
            const acc = accountMap.get(tx.accountId);
            const isIncome = tx.type === 'income';
            const isTransfer = tx.type === 'transfer';

            return (
              <div
                key={tx.id}
                className="p-3.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] flex items-center justify-between hover:border-[#262E3D]/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat ? `${cat.color}20` : '#5687F520' }}
                  >
                    <CategoryIcon
                      name={cat ? cat.icon : isTransfer ? 'ArrowLeftRight' : 'CreditCard'}
                      color={cat ? cat.color : '#5687F5'}
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-[#F5F7FC] truncate">{tx.description}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#929BAD] flex-wrap">
                      <span>{cat ? cat.name : isTransfer ? 'Transferencia' : 'General'}</span>
                      <span>•</span>
                      <span>{formatDateTime(tx.occurredAt)}</span>
                      {tx.syncStatus === 'pending_sync' && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40 font-semibold">
                          Pendiente sync
                        </span>
                      )}
                    </div>
                    {tx.notes && (
                      <p className="text-[10px] text-[#929BAD]/80 italic mt-0.5 truncate">
                        "{tx.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold block ${
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

                  {confirmDeleteId === tx.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          await onDeleteTransaction(tx.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1 rounded-lg bg-[#F87171] text-white text-[10px] font-bold"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg bg-[#262E3D] text-[#929BAD] text-[10px]"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(tx.id)}
                      className="p-1.5 rounded-lg text-[#929BAD]/50 hover:text-[#F87171] hover:bg-[#F87171]/10 transition-colors"
                      title="Eliminar movimiento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
