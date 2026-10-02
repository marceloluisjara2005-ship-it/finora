import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  X,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import type { Budget, Category, InstallmentPlan, Installment } from '../../types/finance';
import { formatCurrency } from '../../lib/currency';
import { getDueStatus, formatMonthLabel } from '../../lib/dates';
import { CategoryIcon } from '../../components/ui/CategoryIcon';

interface BudgetsViewProps {
  currentPeriod: string;
  budgets: Budget[];
  categories: Category[];
  installmentPlans: InstallmentPlan[];
  installments: Installment[];
  privacyMode: boolean;
  onAddBudget: (data: {
    name: string;
    periodMonth: string;
    targetType: 'general' | 'category' | 'group';
    targetId?: string;
    limitAmount: number;
  }) => Promise<void>;
  onPayInstallment: (installmentId: string) => Promise<void>;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  currentPeriod,
  budgets,
  categories,
  installmentPlans,
  installments,
  privacyMode,
  onAddBudget,
  onPayInstallment,
}) => {
  const [activeTab, setActiveTab] = useState<'budgets' | 'installments'>('budgets');
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);

  // New Budget Form State
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<'general' | 'category' | 'group'>('general');
  const [targetId, setTargetId] = useState('');
  const [limitStr, setLimitStr] = useState('');

  const categoryMap = React.useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Current period budgets
  const periodBudgets = budgets.filter((b) => b.periodMonth === currentPeriod);

  // Installment plans with their installments
  const plansWithDetails = installmentPlans.map((plan) => {
    const planInstallments = installments.filter((i) => i.planId === plan.id);
    const paidCount = planInstallments.filter((i) => i.status === 'paid').length;
    const remainingCount = plan.installmentsCount - paidCount;
    const remainingAmount = planInstallments
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      ...plan,
      installments: planInstallments,
      paidCount,
      remainingCount,
      remainingAmount,
    };
  });

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitAmount = parseFloat(limitStr.replace(/,/g, '.')) || 0;
    if (limitAmount <= 0) return;

    await onAddBudget({
      name: name.trim() || 'Presupuesto',
      periodMonth: currentPeriod,
      targetType,
      targetId: targetType === 'general' ? undefined : targetId,
      limitAmount,
    });

    setName('');
    setLimitStr('');
    setIsAddBudgetOpen(false);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      {/* Tab Switcher: Presupuestos vs Cuotas */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#171D2B] border border-[#262E3D]">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'budgets'
              ? 'bg-[#5687F5] text-white shadow-sm'
              : 'text-[#929BAD] hover:text-[#F5F7FC]'
          }`}
        >
          Presupuestos y Límites
        </button>
        <button
          onClick={() => setActiveTab('installments')}
          className={`py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'installments'
              ? 'bg-[#5687F5] text-white shadow-sm'
              : 'text-[#929BAD] hover:text-[#F5F7FC]'
          }`}
        >
          Compras en Cuotas ({plansWithDetails.length})
        </button>
      </div>

      {activeTab === 'budgets' ? (
        <div className="space-y-4">
          {/* Header Action */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#929BAD]">
              Límites para {formatMonthLabel(currentPeriod)}
            </span>
            <button
              onClick={() => setIsAddBudgetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] text-xs font-semibold text-white transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Presupuesto</span>
            </button>
          </div>

          {/* Budgets List */}
          <div className="space-y-3">
            {periodBudgets.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#171D2B] border border-[#262E3D] text-center text-[#929BAD]">
                <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 text-[#929BAD]/50" />
                <p className="text-sm font-medium">No hay presupuestos configurados para este mes.</p>
                <p className="text-xs mt-1 text-[#929BAD]/70">
                  Establece topes de consumo para recibir alertas preventivas al 70%, 90% y 100%.
                </p>
                <button
                  onClick={() => setIsAddBudgetOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#5687F5] text-white text-xs font-semibold"
                >
                  Crear mi primer presupuesto
                </button>
              </div>
            ) : (
              periodBudgets.map((b) => {
                const percent = Math.round((b.spentAmount / b.limitAmount) * 100);
                const remaining = Math.max(0, b.limitAmount - b.spentAmount);

                let statusColor = '#4ADE80';
                let statusBadge = 'Normal';
                if (percent >= 100) {
                  statusColor = '#F87171';
                  statusBadge = 'Superado';
                } else if (percent >= 90) {
                  statusColor = '#FB7185';
                  statusBadge = 'Alerta 90%';
                } else if (percent >= 70) {
                  statusColor = '#FBBF24';
                  statusBadge = 'Preventivo 70%';
                }

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#F5F7FC]">{b.name}</h4>
                        <span className="text-[10px] text-[#929BAD]">
                          {b.targetType === 'general'
                            ? 'Mes completo'
                            : b.targetType === 'category'
                            ? `Categoría específica`
                            : 'Grupo de gastos'}
                        </span>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                        style={{
                          backgroundColor: `${statusColor}15`,
                          color: statusColor,
                          borderColor: `${statusColor}30`,
                        }}
                      >
                        {statusBadge} ({percent}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-[#101522] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(percent, 100)}%`,
                            backgroundColor: statusColor,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#929BAD]">
                        <span>Utilizado: <strong className="text-[#F5F7FC]">{formatCurrency(b.spentAmount, 'ARS', privacyMode)}</strong></span>
                        <span>Límite: <strong className="text-[#F5F7FC]">{formatCurrency(b.limitAmount, 'ARS', privacyMode)}</strong></span>
                      </div>
                    </div>

                    {/* Remaining */}
                    <div className="pt-2 border-t border-[#262E3D]/60 flex items-center justify-between text-xs">
                      <span className="text-[#929BAD]">Disponible para gastar:</span>
                      <span className="font-bold text-[#4ADE80]">
                        {formatCurrency(remaining, 'ARS', privacyMode)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Installment Purchases View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#929BAD]">Planes de financiación activos</span>
          </div>

          <div className="space-y-3">
            {plansWithDetails.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#171D2B] border border-[#262E3D] text-center text-[#929BAD]">
                <Layers className="w-8 h-8 mx-auto mb-2 text-[#929BAD]/50" />
                <p className="text-sm font-medium">No tienes compras en cuotas registradas.</p>
                <p className="text-xs mt-1 text-[#929BAD]/70">
                  Puedes registrar compras financiadas activando «Registrar en cuotas» al añadir un gasto.
                </p>
              </div>
            ) : (
              plansWithDetails.map((plan) => {
                const nextPending = plan.installments.find((i) => i.status !== 'paid');
                const dueInfo = nextPending ? getDueStatus(nextPending.dueDate) : null;

                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-[#5687F5]/20 flex items-center justify-center text-[#5687F5]">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#F5F7FC]">{plan.description}</h4>
                          <span className="text-[10px] text-[#929BAD]">
                            {plan.paidCount} de {plan.installmentsCount} cuotas abonadas
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#F5F7FC] block">
                          {formatCurrency(plan.totalAmount, 'ARS', privacyMode)}
                        </span>
                        <span className="text-[10px] text-[#FB7185]">
                          Resta: {formatCurrency(plan.remainingAmount, 'ARS', privacyMode)}
                        </span>
                      </div>
                    </div>

                    {/* Next due installment & Pay trigger */}
                    {nextPending && (
                      <div className="p-3 rounded-2xl bg-[#101522] border border-[#262E3D] flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#F5F7FC]">
                              Cuota #{nextPending.installmentNumber}: {formatCurrency(nextPending.amount, 'ARS', privacyMode)}
                            </span>
                          </div>
                          {dueInfo && (
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: dueInfo.color }}
                            >
                              {dueInfo.label}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => onPayInstallment(nextPending.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#4ADE80]/20 hover:bg-[#4ADE80]/30 border border-[#4ADE80]/40 text-[#4ADE80] font-semibold text-xs transition-colors"
                        >
                          Pagar Cuota
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Budget */}
      {isAddBudgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#101522] border border-[#262E3D] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F5F7FC]">Nuevo Presupuesto Mensual</h3>
              <button
                onClick={() => setIsAddBudgetOpen(false)}
                className="p-1 rounded-full text-[#929BAD] hover:text-[#F5F7FC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#929BAD] mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Salidas y Ocio, Alimentos..."
                  className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#929BAD] mb-1">Tipo de objetivo</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                >
                  <option value="general">Presupuesto General del Mes</option>
                  <option value="category">Categoría Específica</option>
                  <option value="group">Grupo Financiero (ej. Hormiga)</option>
                </select>
              </div>

              {targetType === 'category' && (
                <div>
                  <label className="block text-xs font-medium text-[#929BAD] mb-1">Categoría</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                  >
                    <option value="">Selecciona categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'group' && (
                <div>
                  <label className="block text-xs font-medium text-[#929BAD] mb-1">Grupo Financiero</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                  >
                    <option value="ant_expense">Gastos Hormiga</option>
                    <option value="variable_expense">Gastos Variables</option>
                    <option value="fixed_expense">Gastos Fijos</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#929BAD] mb-1">Límite de gasto ($ ARS)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={limitStr}
                  onChange={(e) => setLimitStr(e.target.value)}
                  placeholder="ej. 85000"
                  className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] text-xs font-semibold text-white transition-colors"
              >
                Crear Presupuesto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
