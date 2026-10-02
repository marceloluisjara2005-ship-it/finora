import React, { useState } from 'react';
import {
  User,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Bot,
  Plus,
  Send,
  Sparkles,
  Download,
  Trash2,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  X,
  CreditCard,
  Tag,
  Archive,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Account, Category, Debt, FinancialGroup, SavingsGoal, UserProfile } from '../../types/finance';
import { formatCurrency } from '../../lib/currency';
import { CategoryIcon } from '../../components/ui/CategoryIcon';

interface ProfileViewProps {
  profile: UserProfile;
  accounts: Account[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  privacyMode: boolean;
  onAddAccount: (acc: Omit<Account, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onAddSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'currentAmount' | 'status'>) => Promise<void>;
  onContributeSavings: (goalId: string, amount: number) => Promise<void>;
  onAddCategory: (cat: Omit<Category, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onArchiveCategory: (id: string) => Promise<void>;
  onAddDebt: (debt: Omit<Debt, 'id' | 'userId' | 'createdAt' | 'status'>) => Promise<void>;
  onPayDebt: (debtId: string, amount: number, accountId: string) => Promise<void>;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onAskGemini: (prompt: string) => Promise<string>;
  onResetData: () => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  accounts,
  categories,
  savingsGoals,
  debts,
  privacyMode,
  onAddAccount,
  onAddSavingsGoal,
  onContributeSavings,
  onAddCategory,
  onArchiveCategory,
  onAddDebt,
  onPayDebt,
  onUpdateProfile,
  onAskGemini,
  onResetData,
}) => {
  const [activeSection, setActiveSection] = useState<'profile' | 'accounts' | 'savings' | 'debts' | 'categories' | 'assistant'>('profile');

  // Account modal
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<any>('bank');
  const [accInitialBalance, setAccInitialBalance] = useState('');

  // Savings Goal modal
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmountStr, setContributeAmountStr] = useState('');

  // Category modal
  const [isNewCatOpen, setIsNewCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catGroup, setCatGroup] = useState<FinancialGroup>('variable_expense');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catColor, setCatColor] = useState('#60A5FA');

  // Debt modal
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false);
  const [debtCreditor, setDebtCreditor] = useState('');
  const [debtDescription, setDebtDescription] = useState('');
  const [debtOriginalAmountStr, setDebtOriginalAmountStr] = useState('');
  const [payDebtId, setPayDebtId] = useState<string | null>(null);
  const [payDebtAmountStr, setPayDebtAmountStr] = useState('');
  const [payDebtAccountId, setPayDebtAccountId] = useState(accounts[0]?.id || '');

  // Profile Edit modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(profile.displayName);
  const [editCurrency, setEditCurrency] = useState(profile.primaryCurrency);

  // Assistant Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: '¡Hola! Soy tu Contador Público Personal en Finora. Puedo diagnosticar tus finanzas, auditar tus gastos hormiga, evaluar tus cuotas pendientes o sugerirte optimizaciones basadas en tus movimientos reales. ¿Qué deseas consultar hoy?',
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuestion.trim() || isThinking) return;

    const userQ = inputQuestion.trim();
    setInputQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: userQ }]);
    setIsThinking(true);

    try {
      const prompt = `Actúa como Contador Público Personal de la aplicación Finora para el usuario ${profile.displayName}.
Pregunta del usuario: "${userQ}"
Contexto financiero actual:
- Moneda principal: ${profile.primaryCurrency}
- Cuentas activas: ${accounts.map((a) => `${a.name}: $${a.currentBalance}`).join(', ')}
- Metas de ahorro: ${savingsGoals.map((s) => `${s.name}: $${s.currentAmount} de $${s.targetAmount}`).join(', ')}
- Deudas activas: ${debts.map((d) => `${d.creditorName}: $${d.remainingCapital}`).join(', ')}

Responde de forma concisa, profesional, empática y en viñetas directas. Recuerda que no debes garantizar rentabilidades ni brindar asesoramiento legal vinculante.`;

      const reply = await onAskGemini(prompt);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Ocurrió un inconveniente temporal al consultar el asistente. Intenta nuevamente.' },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const initial = parseFloat(accInitialBalance.replace(/,/g, '.')) || 0;

    await onAddAccount({
      name: accName.trim(),
      type: accType,
      currency: profile.primaryCurrency,
      initialBalance: initial,
      currentBalance: initial,
      isActive: true,
      color: '#5687F5',
      icon: accType === 'cash' ? 'Banknote' : accType === 'bank' ? 'Landmark' : 'Wallet',
    });

    setAccName('');
    setAccInitialBalance('');
    setIsNewAccountOpen(false);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetStr.replace(/,/g, '.')) || 0;
    if (target <= 0 || !goalName.trim()) return;

    await onAddSavingsGoal({
      name: goalName.trim(),
      targetAmount: target,
      icon: 'PiggyBank',
      color: '#FB7185',
    });

    setGoalName('');
    setGoalTargetStr('');
    setIsNewGoalOpen(false);
  };

  const handleContribute = async (goalId: string) => {
    const amount = parseFloat(contributeAmountStr.replace(/,/g, '.')) || 0;
    if (amount <= 0) return;

    await onContributeSavings(goalId, amount);

    const targetGoal = savingsGoals.find((g) => g.id === goalId);
    if (targetGoal && targetGoal.currentAmount + amount >= targetGoal.targetAmount) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    }

    setContributeAmountStr('');
    setContributeGoalId(null);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    await onAddCategory({
      name: catName.trim(),
      group: catGroup,
      icon: catIcon,
      color: catColor,
      isArchived: false,
    });

    setCatName('');
    setIsNewCatOpen(false);
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const orig = parseFloat(debtOriginalAmountStr.replace(/,/g, '.')) || 0;
    if (!debtCreditor.trim() || orig <= 0) return;

    await onAddDebt({
      creditorName: debtCreditor.trim(),
      description: debtDescription.trim() || undefined,
      originalAmount: orig,
      remainingCapital: orig,
    });

    setDebtCreditor('');
    setDebtDescription('');
    setDebtOriginalAmountStr('');
    setIsNewDebtOpen(false);
  };

  const handlePayDebtSubmit = async (debtId: string) => {
    const amount = parseFloat(payDebtAmountStr.replace(/,/g, '.')) || 0;
    if (amount <= 0 || !payDebtAccountId) return;

    await onPayDebt(debtId, amount, payDebtAccountId);
    setPayDebtId(null);
    setPayDebtAmountStr('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      displayName: editName.trim(),
      primaryCurrency: editCurrency,
    });
    setIsEditProfileOpen(false);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      {/* Navigation Sub-Tabs Scroller */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-[11px] font-semibold no-scrollbar">
        {[
          { id: 'profile', label: 'Perfil' },
          { id: 'accounts', label: `Cuentas (${accounts.length})` },
          { id: 'savings', label: `Ahorros (${savingsGoals.length})` },
          { id: 'debts', label: `Deudas (${debts.filter((d) => d.status === 'active').length})` },
          { id: 'categories', label: `Categorías (${categories.filter((c) => !c.isArchived).length})` },
          { id: 'assistant', label: 'Contador IA' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeSection === tab.id
                ? 'bg-[#5687F5] text-white shadow-sm'
                : 'text-[#929BAD] hover:text-[#F5F7FC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Profile Section */}
      {activeSection === 'profile' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#171D2B] border border-[#262E3D] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#5687F5] flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {profile.displayName.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F5F7FC]">{profile.displayName}</h3>
                <p className="text-xs text-[#929BAD]">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#101522] text-[#5687F5] border border-[#262E3D]">
                    {profile.primaryCurrency}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#101522] text-[#4ADE80] border border-[#262E3D]">
                    PWA Activa
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#101522] hover:bg-[#202738] border border-[#262E3D] text-xs font-semibold text-[#F5F7FC] transition-colors"
            >
              Editar
            </button>
          </div>

          {/* Quick Metrics Audit */}
          <div className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D] space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#929BAD]">
              Estado del Sistema Financiero
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#101522] border border-[#262E3D]/50 text-center">
                <span className="text-[#929BAD] text-[10px] block">Cuentas</span>
                <span className="font-bold text-[#F5F7FC] text-sm">{accounts.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101522] border border-[#262E3D]/50 text-center">
                <span className="text-[#929BAD] text-[10px] block">Metas Ahorro</span>
                <span className="font-bold text-[#FB7185] text-sm">{savingsGoals.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101522] border border-[#262E3D]/50 text-center">
                <span className="text-[#929BAD] text-[10px] block">Deudas Activas</span>
                <span className="font-bold text-[#FBBF24] text-sm">{debts.filter((d) => d.status === 'active').length}</span>
              </div>
            </div>
          </div>

          {/* Data Reset */}
          <div className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D] space-y-3">
            <h4 className="text-xs font-bold text-[#F87171]">Mantenimiento y Datos</h4>
            <p className="text-xs text-[#929BAD] leading-relaxed">
              Restablece los registros a los valores semilla iniciales de prueba para validar flujos y balances.
            </p>
            <button
              onClick={onResetData}
              className="w-full py-2.5 rounded-xl bg-[#F87171]/15 hover:bg-[#F87171]/25 border border-[#F87171]/30 text-[#F87171] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Restablecer Datos Semilla</span>
            </button>
          </div>

          {/* Edit Profile Modal */}
          {isEditProfileOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-3xl bg-[#101522] border border-[#262E3D] p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F5F7FC]">Editar Perfil</h3>
                  <button onClick={() => setIsEditProfileOpen(false)} className="p-1 text-[#929BAD]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Nombre</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Moneda Principal</label>
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                    >
                      <option value="ARS">ARS - Peso Argentino</option>
                      <option value="USD">USD - Dólar Estadounidense</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#5687F5] text-xs font-semibold text-white"
                  >
                    Guardar Cambios
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Accounts Section */}
      {activeSection === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#929BAD]">Cuentas y saldos en custodia</span>
            <button
              onClick={() => setIsNewAccountOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] text-xs font-semibold text-white transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Cuenta</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${acc.color || '#5687F5'}20` }}
                  >
                    <Wallet className="w-5 h-5" style={{ color: acc.color || '#5687F5' }} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#F5F7FC]">{acc.name}</h4>
                    <span className="text-[10px] text-[#929BAD] capitalize">{acc.type}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-[#F5F7FC] block">
                    {formatCurrency(acc.currentBalance, acc.currency, privacyMode)}
                  </span>
                  <span className="text-[10px] text-[#4ADE80]">Activa</span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal New Account */}
          {isNewAccountOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-3xl bg-[#101522] border border-[#262E3D] p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F5F7FC]">Añadir Cuenta Financiera</h3>
                  <button onClick={() => setIsNewAccountOpen(false)} className="p-1 text-[#929BAD]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateAccount} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Nombre</label>
                    <input
                      type="text"
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="ej. Banco Santander, Brubank..."
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Tipo de cuenta</label>
                    <select
                      value={accType}
                      onChange={(e) => setAccType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                    >
                      <option value="bank">Cuenta Bancaria</option>
                      <option value="digital_wallet">Billetera Virtual</option>
                      <option value="cash">Efectivo</option>
                      <option value="savings">Caja de Ahorro / Reserva</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Saldo inicial ($ {profile.primaryCurrency})</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={accInitialBalance}
                      onChange={(e) => setAccInitialBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#5687F5] text-xs font-semibold text-white"
                  >
                    Guardar Cuenta
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Savings Goals Section */}
      {activeSection === 'savings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#929BAD]">Objetivos de ahorro</span>
            <button
              onClick={() => setIsNewGoalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] text-xs font-semibold text-white transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Meta</span>
            </button>
          </div>

          <div className="space-y-3">
            {savingsGoals.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#171D2B] border border-[#262E3D] text-center text-[#929BAD]">
                <PiggyBank className="w-8 h-8 mx-auto mb-2 text-[#929BAD]/50" />
                <p className="text-sm font-medium">No hay metas de ahorro activas.</p>
              </div>
            ) : (
              savingsGoals.map((goal) => {
                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                const isCompleted = goal.currentAmount >= goal.targetAmount;

                return (
                  <div key={goal.id} className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D] space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-[#FB7185]/20 flex items-center justify-center text-[#FB7185]">
                          <PiggyBank className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#F5F7FC]">{goal.name}</h4>
                          <span className="text-[10px] text-[#929BAD]">
                            Meta: {formatCurrency(goal.targetAmount, profile.primaryCurrency, privacyMode)}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isCompleted
                            ? 'bg-[#4ADE80]/20 text-[#4ADE80] border-[#4ADE80]/40'
                            : 'bg-[#FB7185]/20 text-[#FB7185] border-[#FB7185]/40'
                        }`}
                      >
                        {isCompleted ? '¡Cumplida!' : `${percent}%`}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#101522] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FB7185] to-[#4ADE80] transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[#929BAD]">
                        Acumulado: <strong className="text-[#F5F7FC]">{formatCurrency(goal.currentAmount, profile.primaryCurrency, privacyMode)}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setContributeGoalId(goal.id);
                          setContributeAmountStr('');
                        }}
                        className="px-3 py-1 rounded-xl bg-[#FB7185]/15 hover:bg-[#FB7185]/25 border border-[#FB7185]/40 text-[#FB7185] text-xs font-semibold"
                      >
                        + Aportar
                      </button>
                    </div>

                    {contributeGoalId === goal.id && (
                      <div className="pt-2 border-t border-[#262E3D] flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={contributeAmountStr}
                          onChange={(e) => setContributeAmountStr(e.target.value)}
                          placeholder="Monto a aportar..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#101522] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#FB7185]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleContribute(goal.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#FB7185] text-white text-xs font-semibold"
                        >
                          Confirmar
                        </button>
                        <button onClick={() => setContributeGoalId(null)} className="p-1 text-[#929BAD]">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Modal New Goal */}
          {isNewGoalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-3xl bg-[#101522] border border-[#262E3D] p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F5F7FC]">Nuevo Objetivo de Ahorro</h3>
                  <button onClick={() => setIsNewGoalOpen(false)} className="p-1 text-[#929BAD]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateGoal} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Nombre</label>
                    <input
                      type="text"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder="ej. Vacaciones..."
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Monto Objetivo ($ {profile.primaryCurrency})</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={goalTargetStr}
                      onChange={(e) => setGoalTargetStr(e.target.value)}
                      placeholder="ej. 500000"
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#5687F5] text-xs font-semibold text-white"
                  >
                    Guardar Meta
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Debts Section */}
      {activeSection === 'debts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#929BAD]">Control de pasivos y deudas</span>
            <button
              onClick={() => setIsNewDebtOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] text-xs font-semibold text-white transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Deuda</span>
            </button>
          </div>

          <div className="space-y-3">
            {debts.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#171D2B] border border-[#262E3D] text-center text-[#929BAD]">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-[#4ADE80]" />
                <p className="text-sm font-medium">¡Estás libre de deudas registradas!</p>
                <p className="text-xs mt-1 text-[#929BAD]/70">
                  Si adquieres un préstamo o pasivo, puedes registrarlo aquí para planificar su cancelación.
                </p>
              </div>
            ) : (
              debts.map((d) => {
                const isPaid = d.status === 'paid' || d.remainingCapital <= 0;
                return (
                  <div key={d.id} className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#F5F7FC]">{d.creditorName}</h4>
                        {d.description && <p className="text-[10px] text-[#929BAD]">{d.description}</p>}
                        <span className="text-[10px] text-[#929BAD] mt-0.5 block">
                          Original: {formatCurrency(d.originalAmount, profile.primaryCurrency, privacyMode)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-bold ${isPaid ? 'text-[#4ADE80]' : 'text-[#FB7185]'}`}>
                          {isPaid ? 'Cancelada' : `Resta: ${formatCurrency(d.remainingCapital, profile.primaryCurrency, privacyMode)}`}
                        </span>
                      </div>
                    </div>

                    {!isPaid && (
                      <div className="pt-2 border-t border-[#262E3D] flex items-center justify-between">
                        <span className="text-xs text-[#929BAD]">Amortizar deuda:</span>
                        <button
                          onClick={() => {
                            setPayDebtId(d.id);
                            setPayDebtAmountStr('');
                          }}
                          className="px-3 py-1 rounded-xl bg-[#FB7185]/15 hover:bg-[#FB7185]/25 border border-[#FB7185]/40 text-[#FB7185] text-xs font-semibold"
                        >
                          Pagar Parcial / Total
                        </button>
                      </div>
                    )}

                    {payDebtId === d.id && (
                      <div className="p-3 rounded-2xl bg-[#101522] border border-[#262E3D] space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={payDebtAmountStr}
                            onChange={(e) => setPayDebtAmountStr(e.target.value)}
                            placeholder="Monto a abonar..."
                            className="px-3 py-1.5 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#FB7185]"
                            autoFocus
                          />
                          <select
                            value={payDebtAccountId}
                            onChange={(e) => setPayDebtAccountId(e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#FB7185]"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPayDebtId(null)}
                            className="px-3 py-1 rounded-xl bg-[#262E3D] text-[#929BAD] text-xs"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handlePayDebtSubmit(d.id)}
                            className="px-3 py-1 rounded-xl bg-[#4ADE80] text-[#080B12] font-semibold text-xs"
                          >
                            Confirmar Pago
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Modal New Debt */}
          {isNewDebtOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-3xl bg-[#101522] border border-[#262E3D] p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F5F7FC]">Registrar Deuda</h3>
                  <button onClick={() => setIsNewDebtOpen(false)} className="p-1 text-[#929BAD]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateDebt} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Acreedor o Institución</label>
                    <input
                      type="text"
                      value={debtCreditor}
                      onChange={(e) => setDebtCreditor(e.target.value)}
                      placeholder="ej. Préstamo Banco, Amigo..."
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Descripción / Motivo</label>
                    <input
                      type="text"
                      value={debtDescription}
                      onChange={(e) => setDebtDescription(e.target.value)}
                      placeholder="ej. Reparación de vehículo..."
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Capital Original ($ {profile.primaryCurrency})</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={debtOriginalAmountStr}
                      onChange={(e) => setDebtOriginalAmountStr(e.target.value)}
                      placeholder="ej. 300000"
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#5687F5] text-xs font-semibold text-white"
                  >
                    Guardar Deuda
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Categories Section */}
      {activeSection === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#929BAD]">Categorías de clasificación</span>
            <button
              onClick={() => setIsNewCatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] text-xs font-semibold text-white transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Categoría</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-2xl bg-[#171D2B] border border-[#262E3D] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <CategoryIcon name={cat.icon} color={cat.color} className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#F5F7FC]">{cat.name}</h4>
                    <span className="text-[10px] text-[#929BAD] capitalize">
                      {cat.group.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {!cat.isArchived ? (
                  <button
                    onClick={() => onArchiveCategory(cat.id)}
                    className="p-1.5 rounded-lg text-[#929BAD]/50 hover:text-[#FB7185] hover:bg-[#FB7185]/10 transition-colors"
                    title="Archivar categoría"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] text-[#929BAD] italic">Archivada</span>
                )}
              </div>
            ))}
          </div>

          {/* Modal New Category */}
          {isNewCatOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-3xl bg-[#101522] border border-[#262E3D] p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F5F7FC]">Nueva Categoría</h3>
                  <button onClick={() => setIsNewCatOpen(false)} className="p-1 text-[#929BAD]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateCategory} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Nombre</label>
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="ej. Gimnasio, Mascotas..."
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#929BAD] mb-1">Grupo Financiero</label>
                    <select
                      value={catGroup}
                      onChange={(e) => setCatGroup(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                    >
                      <option value="fixed_expense">Gastos Fijos</option>
                      <option value="variable_expense">Gastos Variables</option>
                      <option value="ant_expense">Gastos Hormiga</option>
                      <option value="income">Ingresos</option>
                      <option value="savings_debt">Ahorros y Deudas</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-[#929BAD] mb-1">Icono</label>
                      <select
                        value={catIcon}
                        onChange={(e) => setCatIcon(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      >
                        <option value="Tag">Etiqueta (Tag)</option>
                        <option value="Activity">Salud (Activity)</option>
                        <option value="ShoppingBag">Compras (Bag)</option>
                        <option value="Car">Auto (Car)</option>
                        <option value="Coffee">Café (Coffee)</option>
                        <option value="Tv">Streaming (Tv)</option>
                        <option value="Home">Hogar (Home)</option>
                        <option value="Sparkles">Extra (Sparkles)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#929BAD] mb-1">Color</label>
                      <select
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5]"
                      >
                        <option value="#60A5FA">Azul (Variable)</option>
                        <option value="#FBBF24">Ámbar (Fijo)</option>
                        <option value="#D8A4FF">Púrpura (Hormiga)</option>
                        <option value="#4ADE80">Verde (Ingreso)</option>
                        <option value="#FB7185">Rosa (Ahorro/Deuda)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#5687F5] text-xs font-semibold text-white"
                  >
                    Guardar Categoría
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. AI Accountant Chat Section */}
      {activeSection === 'assistant' && (
        <div className="h-[65vh] flex flex-col rounded-3xl bg-[#171D2B] border border-[#262E3D] overflow-hidden">
          <div className="p-3.5 border-b border-[#262E3D] bg-[#101522] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#5687F5]/20 flex items-center justify-center text-[#5687F5]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#F5F7FC]">Contador Personal Finora</h4>
                <span className="text-[10px] text-[#4ADE80]">En línea • Gemini 3.8 Flash</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed no-scrollbar">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#5687F5] text-white rounded-br-none'
                      : 'bg-[#101522] text-[#F5F7FC] border border-[#262E3D] rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl bg-[#101522] text-[#929BAD] border border-[#262E3D] flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#5687F5] animate-ping" />
                  <span>El Contador está analizando tus cuentas...</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-1.5 border-t border-[#262E3D]/40 bg-[#101522] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
            {[
              '¿Cuánto gasté en gastos hormiga?',
              '¿Cómo van mis cuotas?',
              'Sugerencias para optimizar mi flujo',
            ].map((p) => (
              <button
                key={p}
                onClick={() => setInputQuestion(p)}
                className="px-2.5 py-1 rounded-xl bg-[#171D2B] text-[#929BAD] hover:text-[#F5F7FC] border border-[#262E3D] whitespace-nowrap transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-[#101522] border-t border-[#262E3D] flex items-center gap-2">
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Hazle una consulta a tu contador..."
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[#171D2B] border border-[#262E3D] text-xs text-[#F5F7FC] focus:outline-none focus:border-[#5687F5] placeholder:text-[#929BAD]/50"
            />
            <button
              type="submit"
              disabled={isThinking || !inputQuestion.trim()}
              className="w-9 h-9 rounded-2xl bg-[#5687F5] hover:bg-[#4374E0] active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
