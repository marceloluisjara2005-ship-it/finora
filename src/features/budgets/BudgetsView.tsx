import React, { useState, useEffect, useMemo } from 'react';
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
  Bell,
  BellRing,
  Settings,
  Clock,
  Smartphone,
  Inbox,
  Check,
} from 'lucide-react';
import type { Budget, Category, InstallmentPlan, Installment } from '../../types/finance';
import { formatCurrency } from '../../lib/currency';
import { getDueStatus, formatMonthLabel } from '../../lib/dates';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import {
  getInstallmentReminderSettings,
  saveInstallmentReminderSettings,
  requestPushPermission,
  getPushPermission,
  isPushSupported,
  testSampleInstallmentReminder,
  checkAndDispatchInstallmentReminders,
  getUpcomingInstallments,
  type InstallmentReminderSettings,
} from '../../lib/installmentReminders';

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
  currency?: string;
  onRefreshNotifications?: () => void;
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
  currency = 'ARS',
  onRefreshNotifications,
}) => {
  const [activeTab, setActiveTab] = useState<'budgets' | 'installments'>('budgets');
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);

  // Installment Reminders State
  const [reminderSettings, setReminderSettings] = useState<InstallmentReminderSettings>(() =>
    getInstallmentReminderSettings()
  );
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isTestingReminder, setIsTestingReminder] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [pushPerm, setPushPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    getPushPermission()
  );

  // New Budget Form State
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<'general' | 'category' | 'group'>('general');
  const [targetId, setTargetId] = useState('');
  const [limitStr, setLimitStr] = useState('');

  // Close modals on Escape key
  useEffect(() => {
    if (!isReminderModalOpen && !isAddBudgetOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsReminderModalOpen(false);
        setIsAddBudgetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReminderModalOpen, isAddBudgetOpen]);

  // Check and dispatch due installment alerts on mount and updates
  useEffect(() => {
    checkAndDispatchInstallmentReminders(installmentPlans, installments, currency).then((res) => {
      if (res.dispatched > 0) {
        onRefreshNotifications?.();
      }
    });
  }, [installmentPlans, installments, currency, onRefreshNotifications]);

  const upcomingInstallments = useMemo(() => {
    return getUpcomingInstallments(installmentPlans, installments, 14);
  }, [installmentPlans, installments]);

  const handleUpdateReminderSettings = (newSettings: Partial<InstallmentReminderSettings>) => {
    const updated = { ...reminderSettings, ...newSettings };
    setReminderSettings(updated);
    saveInstallmentReminderSettings(updated);
  };

  const handleTogglePlanReminder = (planId: string) => {
    const currentVal = reminderSettings.customPlanAlerts[planId] !== false;
    const nextCustom = { ...reminderSettings.customPlanAlerts, [planId]: !currentVal };
    handleUpdateReminderSettings({ customPlanAlerts: nextCustom });
  };

  const handleRequestPush = async () => {
    const perm = await requestPushPermission();
    setPushPerm(perm);
    if (perm === 'granted') {
      handleUpdateReminderSettings({ notifyPush: true });
    }
  };

  const handleTestReminder = async () => {
    setIsTestingReminder(true);
    setTestFeedback(null);
    try {
      const samplePlan = installmentPlans[0]?.description || 'Compra en Cuotas';
      const sampleAmount = installments.find((i) => i.status !== 'paid')?.amount || 25000;
      const res = await testSampleInstallmentReminder(samplePlan, sampleAmount, currency);
      setTestFeedback(res.message);
      onRefreshNotifications?.();
      setTimeout(() => setTestFeedback(null), 5000);
    } catch {
      setTestFeedback('Error al probar la notificación.');
    } finally {
      setIsTestingReminder(false);
    }
  };

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
      {/* Tab Switcher: Presupuestos vs Cuotas & Quick Reminder Action */}
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#171D2B] border border-[#262E3D] flex-1">
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

        {/* Global Reminder Shortcut */}
        <button
          type="button"
          onClick={() => setIsReminderModalOpen(true)}
          className={`p-2.5 rounded-2xl border transition-all relative shrink-0 cursor-pointer ${
            reminderSettings.enabled
              ? 'bg-[#171D2B] border-[#5687F5]/50 text-[#5687F5] hover:bg-[#202738]'
              : 'bg-[#171D2B] border-[#262E3D] text-gray-500 hover:text-gray-300'
          }`}
          title="Configurar recordatorios push y locales para cuotas pendientes"
          aria-label="Configurar recordatorios de cuotas"
        >
          {reminderSettings.enabled ? (
            <BellRing className="w-4 h-4 text-[#5687F5]" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {upcomingInstallments.some((u) => u.daysLeft <= reminderSettings.daysBefore) && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          )}
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
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(true)}
              className="text-xs text-[#5687F5] hover:text-[#7FA5FF] flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Recordatorios ({reminderSettings.enabled ? 'Activos' : 'Pausados'})</span>
            </button>
          </div>

          {/* Reminder Quick Status Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#171D2B] to-[#121826] border border-[#262E3D] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#5687F5]/20 flex items-center justify-center text-[#5687F5] shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#F5F7FC]">Recordatorios de Cuotas</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      reminderSettings.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {reminderSettings.enabled
                      ? reminderSettings.daysBefore === 0
                        ? 'El mismo día'
                        : `${reminderSettings.daysBefore}d de anticipación`
                      : 'Desactivado'}
                  </span>
                </div>
                <p className="text-[10px] text-[#929BAD] mt-0.5">
                  {reminderSettings.enabled
                    ? `${reminderSettings.notifyPush ? 'Alertas locales/push' : ''}${
                        reminderSettings.notifyPush && reminderSettings.notifyInApp ? ' y ' : ''
                      }${reminderSettings.notifyInApp ? 'Centro de notificaciones' : ''} activas`
                    : 'Activa recordatorios para no olvidar las fechas de pago'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#202738] hover:bg-[#283247] border border-[#262E3D] text-[11px] font-semibold text-[#F5F7FC] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Settings className="w-3.5 h-3.5 text-[#5687F5]" />
              <span>Configurar</span>
            </button>
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
                const isPlanAlertEnabled = reminderSettings.customPlanAlerts[plan.id] !== false;

                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-[#5687F5]/20 flex items-center justify-center text-[#5687F5] shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-[#F5F7FC]">{plan.description}</h4>
                            <button
                              type="button"
                              onClick={() => handleTogglePlanReminder(plan.id)}
                              className={`p-1 rounded-md transition-colors ${
                                isPlanAlertEnabled && reminderSettings.enabled
                                  ? 'text-[#5687F5] hover:bg-[#5687F5]/20'
                                  : 'text-gray-500 hover:text-gray-300'
                              }`}
                              title={
                                isPlanAlertEnabled
                                  ? 'Recordatorio activo para este plan (clic para silenciar)'
                                  : 'Recordatorio silenciado para este plan (clic para activar)'
                              }
                            >
                              <Bell className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-[#929BAD]">
                            {plan.paidCount} de {plan.installmentsCount} cuotas abonadas
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#F5F7FC] block">
                          {formatCurrency(plan.totalAmount, currency, privacyMode)}
                        </span>
                        <span className="text-[10px] text-[#FB7185]">
                          Resta: {formatCurrency(plan.remainingAmount, currency, privacyMode)}
                        </span>
                      </div>
                    </div>

                    {/* Next due installment & Pay trigger */}
                    {nextPending && (
                      <div className="p-3 rounded-2xl bg-[#101522] border border-[#262E3D] flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#F5F7FC]">
                              Cuota #{nextPending.installmentNumber}: {formatCurrency(nextPending.amount, currency, privacyMode)}
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
                          className="px-3 py-1.5 rounded-xl bg-[#4ADE80]/20 hover:bg-[#4ADE80]/30 border border-[#4ADE80]/40 text-[#4ADE80] font-semibold text-xs transition-colors cursor-pointer"
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

      {/* Modal: Configurar Recordatorios de Cuotas */}
      {isReminderModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsReminderModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto"
        >
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0E131F] border border-[#1F293D] p-5 sm:p-6 shadow-2xl relative my-auto text-left space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5687F5]/20 border border-[#5687F5]/30 flex items-center justify-center text-[#5687F5] shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="reminder-modal-title" className="text-base font-bold text-white tracking-tight">
                    Recordatorios de Cuotas
                  </h3>
                  <p className="text-xs text-gray-400">Alertas automáticas antes del vencimiento</p>
                </div>
              </div>
              <button
                onClick={() => setIsReminderModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-[#161F33] transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Toggle */}
            <div className="p-3.5 rounded-2xl bg-[#121826] border border-[#1F293D] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Activar Recordatorios</span>
                <span className="text-[11px] text-gray-400">Recibe avisos antes de las fechas de corte</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderSettings.enabled}
                  onChange={(e) => handleUpdateReminderSettings({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5687F5]"></div>
              </label>
            </div>

            {reminderSettings.enabled && (
              <div className="space-y-4 animate-fade-in">
                {/* Anticipation selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5687F5]" />
                    ¿Con cuánta anticipación avisar?
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { days: 0, label: 'El mismo día' },
                      { days: 1, label: '1 día antes' },
                      { days: 2, label: '2 días antes' },
                      { days: 3, label: '3 días antes' },
                      { days: 5, label: '5 días antes' },
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => handleUpdateReminderSettings({ daysBefore: opt.days })}
                        className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                          reminderSettings.daysBefore === opt.days
                            ? 'bg-[#5687F5] border-[#5687F5] text-white font-semibold shadow-sm'
                            : 'bg-[#121826] border-[#1F293D] text-gray-300 hover:bg-[#161F33]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Channels */}
                <div>
                  <span className="block text-xs font-semibold text-gray-300 mb-2">Canales de notificación</span>
                  <div className="space-y-2">
                    {/* Push / Local Device Notification */}
                    <div className="p-3 rounded-2xl bg-[#121826] border border-[#1F293D] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-4 h-4 text-[#5687F5] shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-white block">Notificación del Dispositivo</span>
                          <span className="text-[10px] text-gray-400">
                            {pushPerm === 'granted'
                              ? 'Permiso concedido en este navegador'
                              : pushPerm === 'denied'
                              ? 'Permiso bloqueado en el navegador'
                              : 'Requiere permiso del navegador'}
                          </span>
                        </div>
                      </div>

                      {pushPerm === 'granted' ? (
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={reminderSettings.notifyPush}
                            onChange={(e) => handleUpdateReminderSettings({ notifyPush: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5687F5]"></div>
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRequestPush}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#5687F5]/20 hover:bg-[#5687F5]/30 text-[#5687F5] border border-[#5687F5]/30 shrink-0 cursor-pointer"
                        >
                          Habilitar
                        </button>
                      )}
                    </div>

                    {/* Finora In-App Notification Center */}
                    <div className="p-3 rounded-2xl bg-[#121826] border border-[#1F293D] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Inbox className="w-4 h-4 text-[#5687F5] shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-white block">Centro de Notificaciones</span>
                          <span className="text-[10px] text-gray-400">Bandeja in-app (ícono de campana)</span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={reminderSettings.notifyInApp}
                          onChange={(e) => handleUpdateReminderSettings({ notifyInApp: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5687F5]"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Test Feedback Message */}
                {testFeedback && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2 animate-fade-in">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{testFeedback}</span>
                  </div>
                )}

                {/* Test Notification Action */}
                <button
                  type="button"
                  disabled={isTestingReminder}
                  onClick={handleTestReminder}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#161F33] hover:bg-[#1E2942] border border-[#28354D] text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-[#5687F5]" />
                  <span>{isTestingReminder ? 'Enviando prueba...' : 'Enviar alerta de prueba ahora'}</span>
                </button>
              </div>
            )}

            {/* Upcoming Pending Installments preview */}
            <div>
              <span className="text-xs font-semibold text-gray-300 block mb-2">
                Próximas cuotas a vencer ({upcomingInstallments.length})
              </span>
              {upcomingInstallments.length === 0 ? (
                <div className="p-3 rounded-2xl bg-[#121826] border border-[#1F293D] text-center text-xs text-gray-400">
                  No hay cuotas con vencimiento próximo en los próximos 14 días.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {upcomingInstallments.slice(0, 5).map(({ plan, installment, formattedDue, statusLabel, isUrgent }) => (
                    <div
                      key={installment.id}
                      className="p-2.5 rounded-xl bg-[#121826] border border-[#1F293D] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-white block truncate">{plan.description}</span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span>Cuota #{installment.installmentNumber}</span>
                          <span>•</span>
                          <span className={isUrgent ? 'text-amber-400 font-medium' : ''}>{statusLabel} ({formattedDue})</span>
                        </div>
                      </div>
                      <span className="font-bold text-white shrink-0">
                        {formatCurrency(installment.amount, currency, privacyMode)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(false)}
              className="w-full py-3 rounded-xl bg-[#5687F5] hover:bg-[#4375E6] text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
            >
              Listo, guardar preferencias
            </button>
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
