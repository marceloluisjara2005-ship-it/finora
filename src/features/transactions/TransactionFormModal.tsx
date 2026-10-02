import React, { useState, useEffect } from 'react';
import { X, Calendar, Layers, ArrowRight, Check, AlertCircle } from 'lucide-react';
import type { Account, Category, TransactionType } from '../../types/finance';
import { CategoryIcon } from '../../components/ui/CategoryIcon';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onSubmit: (data: {
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
  }) => Promise<void>;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onSubmit,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-fill current device time on open
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      // Format local datetime for datetime-local input YYYY-MM-DDTHH:mm
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setOccurredAt(localISO);

      // Default account
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
      if (accounts.length > 1 && !destinationAccountId) {
        setDestinationAccountId(accounts[1].id);
      }

      setErrorMsg(null);
    }
  }, [isOpen, accounts]);

  // Filter categories by selected transaction type
  const filteredCategories = categories.filter((c) => {
    if (type === 'income') return c.group === 'income';
    if (type === 'expense') {
      return (
        c.group === 'fixed_expense' ||
        c.group === 'variable_expense' ||
        c.group === 'ant_expense'
      );
    }
    return c.group === 'savings_debt';
  });

  // Default category if none selected or invalid for current type
  useEffect(() => {
    if (filteredCategories.length > 0 && (!categoryId || !filteredCategories.some((c) => c.id === categoryId))) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountStr.replace(/,/g, '.')) || 0;

  // Exact installment calculation with cents precision
  const installmentAmount =
    isInstallment && installmentsCount > 0
      ? (Math.floor((numericAmount * 100) / installmentsCount) / 100).toFixed(2)
      : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numericAmount <= 0) {
      setErrorMsg('El importe debe ser mayor a 0');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Por favor ingresa una descripción');
      return;
    }
    if (!accountId) {
      setErrorMsg('Selecciona una cuenta');
      return;
    }
    if (type === 'transfer' && accountId === destinationAccountId) {
      setErrorMsg('La cuenta de origen y destino deben ser distintas');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        type,
        amount: numericAmount,
        description: description.trim(),
        accountId,
        categoryId: type === 'transfer' ? undefined : categoryId,
        occurredAt: new Date(occurredAt).toISOString(),
        notes: notes.trim() || undefined,
        isInstallment: type === 'expense' && isInstallment,
        installmentsCount: type === 'expense' && isInstallment ? installmentsCount : undefined,
        destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      });
      // Reset form
      setAmountStr('');
      setDescription('');
      setNotes('');
      setIsInstallment(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md max-h-[92vh] rounded-t-3xl bg-[#101522] border-t border-[#262E3D] shadow-2xl flex flex-col overflow-hidden">
        {/* iOS Pull indicator */}
        <div className="w-12 h-1.5 bg-[#262E3D] rounded-full mx-auto mt-2.5 mb-1" aria-hidden="true" />

        {/* Modal Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-[#262E3D]">
          <h2 id="modal-title" className="text-base font-semibold text-[#F5F7FC]">
            Nuevo Movimiento
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-full text-[#929BAD] hover:text-[#F5F7FC] hover:bg-[#171D2B] transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#F87171]/10 border border-[#F87171]/30 flex items-center gap-2 text-xs text-[#F87171]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Transaction Type Segmented Control */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#171D2B] border border-[#262E3D]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setIsInstallment(false);
              }}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                type === 'expense'
                  ? 'bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/40 shadow-sm'
                  : 'text-[#929BAD] hover:text-[#F5F7FC]'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setIsInstallment(false);
              }}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                type === 'income'
                  ? 'bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 shadow-sm'
                  : 'text-[#929BAD] hover:text-[#F5F7FC]'
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setIsInstallment(false);
              }}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                type === 'transfer'
                  ? 'bg-[#5687F5]/20 text-[#5687F5] border border-[#5687F5]/40 shadow-sm'
                  : 'text-[#929BAD] hover:text-[#F5F7FC]'
              }`}
            >
              Transferencia
            </button>
          </div>

          {/* Amount Input with big numbers */}
          <div className="p-4 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-center">
            <span className="text-xs text-[#929BAD] font-medium uppercase tracking-wider">Importe</span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-2xl font-light text-[#929BAD]">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full text-center text-3xl font-bold bg-transparent text-[#F5F7FC] focus:outline-none placeholder:text-[#929BAD]/30"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#929BAD] mb-1.5">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'income'
                  ? 'ej. Cobro de Sueldo, Venta...'
                  : type === 'transfer'
                  ? 'ej. Transferencia a caja de ahorro...'
                  : 'ej. Supermercado, Alquiler, Café...'
              }
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-sm text-[#F5F7FC] placeholder:text-[#929BAD]/50 focus:outline-none focus:border-[#5687F5]"
            />
          </div>

          {/* Accounts Selector */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#929BAD] mb-1.5">Origen</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#929BAD] mb-1.5">Destino</label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[#929BAD] mb-1.5">Cuenta de pago</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Categories Horizontal Grid (if not transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-medium text-[#929BAD] mb-1.5">Categoría</label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 no-scrollbar">
                {filteredCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2 p-2 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#171D2B] border-[#5687F5] shadow-md text-[#F5F7FC]'
                          : 'bg-[#171D2B]/50 border-[#262E3D]/60 text-[#929BAD] hover:border-[#262E3D]'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <CategoryIcon name={cat.icon} color={cat.color} className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-medium truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Installments Option (for expenses) */}
          {type === 'expense' && (
            <div className="p-3.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FBBF24]" />
                  <div>
                    <span className="text-xs font-medium text-[#F5F7FC]">Registrar en cuotas</span>
                    <p className="text-[10px] text-[#929BAD]">Divide el monto en pagos mensuales futuros</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => setIsInstallment(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5687F5] focus:ring-0 bg-[#101522] border-[#262E3D]"
                />
              </div>

              {isInstallment && (
                <div className="pt-2 border-t border-[#262E3D]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#929BAD]">Cantidad de cuotas:</span>
                    <div className="flex items-center gap-1.5">
                      {[2, 3, 6, 12].map((cnt) => (
                        <button
                          type="button"
                          key={cnt}
                          onClick={() => setInstallmentsCount(cnt)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                            installmentsCount === cnt
                              ? 'bg-[#5687F5] text-white'
                              : 'bg-[#101522] text-[#929BAD] border border-[#262E3D]'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                  {numericAmount > 0 && (
                    <div className="p-2 rounded-xl bg-[#101522] text-[11px] text-[#929BAD] flex items-center justify-between">
                      <span>Importe por cuota:</span>
                      <span className="font-semibold text-[#F5F7FC]">{installmentsCount}x de $ {installmentAmount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Occurred At Date / Time Picker */}
          <div>
            <label className="block text-xs font-medium text-[#929BAD] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#5687F5]" />
              <span>Fecha y hora del movimiento</span>
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
            />
          </div>

          {/* Notes Optional */}
          <div>
            <label className="block text-xs font-medium text-[#929BAD] mb-1.5">Notas adicionales (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre el comercio, factura o motivo..."
              className="w-full px-3.5 py-2 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] placeholder:text-[#929BAD]/50 focus:outline-none focus:border-[#5687F5]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 pb-safe">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#5687F5] hover:brightness-110 active:scale-[0.98] text-white text-sm font-semibold shadow-[0_4px_16px_rgba(86,135,245,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Guardando...' : 'Confirmar Movimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
