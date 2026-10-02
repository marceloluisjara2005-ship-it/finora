import React, { useState, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  Printer,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Category, Transaction } from '../../types/finance';
import { formatCurrency, formatCompactCurrency } from '../../lib/currency';
import { formatMonthLabel, getPreviousMonth } from '../../lib/dates';

interface StatsViewProps {
  currentPeriod: string;
  transactions: Transaction[];
  categories: Category[];
  privacyMode: boolean;
  onAskGemini: (prompt: string) => Promise<string>;
}

export const StatsView: React.FC<StatsViewProps> = ({
  currentPeriod,
  transactions,
  categories,
  privacyMode,
  onAskGemini,
}) => {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Current month transactions
  const currentMonthTx = useMemo(() => {
    return transactions.filter((t) => t.occurredAt.startsWith(currentPeriod));
  }, [transactions, currentPeriod]);

  // Previous month transactions for comparative analysis
  const prevPeriod = useMemo(() => getPreviousMonth(currentPeriod), [currentPeriod]);
  const prevMonthTx = useMemo(() => {
    return transactions.filter((t) => t.occurredAt.startsWith(prevPeriod));
  }, [transactions, prevPeriod]);

  // Current month calculations
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let fixedExpense = 0;
    let variableExpense = 0;
    let antExpense = 0;
    let savingsDeposit = 0;

    const catSums = new Map<string, number>();

    for (const t of currentMonthTx) {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expense += t.amount;
        const cat = t.categoryId ? categoryMap.get(t.categoryId) : undefined;
        if (cat) {
          if (cat.group === 'fixed_expense') fixedExpense += t.amount;
          else if (cat.group === 'variable_expense') variableExpense += t.amount;
          else if (cat.group === 'ant_expense') antExpense += t.amount;
          catSums.set(cat.name, (catSums.get(cat.name) || 0) + t.amount);
        } else {
          variableExpense += t.amount;
          catSums.set('Otros', (catSums.get('Otros') || 0) + t.amount);
        }
      } else if (t.type === 'savings_deposit') {
        savingsDeposit += t.amount;
      }
    }

    // Previous month comparison
    let prevIncome = 0;
    let prevExpense = 0;
    for (const t of prevMonthTx) {
      if (t.type === 'income') prevIncome += t.amount;
      else if (t.type === 'expense') prevExpense += t.amount;
    }

    const netBalance = income - expense;
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    const expenseDiffPercent = prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : 0;

    // Top categories list
    const topCategories = Array.from(catSums.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: expense > 0 ? Math.round((amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      income,
      expense,
      fixedExpense,
      variableExpense,
      antExpense,
      savingsDeposit,
      netBalance,
      savingsRate,
      prevIncome,
      prevExpense,
      expenseDiffPercent,
      topCategories,
    };
  }, [currentMonthTx, prevMonthTx, categoryMap]);

  // Comparison Bar Chart Data
  const barChartData = [
    {
      period: formatMonthLabel(prevPeriod),
      Ingresos: stats.prevIncome,
      Gastos: stats.prevExpense,
    },
    {
      period: formatMonthLabel(currentPeriod),
      Ingresos: stats.income,
      Gastos: stats.expense,
    },
  ];

  // Group Distribution Pie
  const groupPieData = [
    { name: 'Gastos Fijos', value: stats.fixedExpense, color: '#FBBF24' },
    { name: 'Variables', value: stats.variableExpense, color: '#60A5FA' },
    { name: 'Hormiga', value: stats.antExpense, color: '#D8A4FF' },
  ].filter((g) => g.value > 0);

  // Trigger Gemini AI Report
  const handleGenerateAIReport = async () => {
    try {
      setIsGeneratingAI(true);
      const prompt = `Actúa como Contador Público Personal para la app Finora.
Analiza estrictamente estos datos del período ${formatMonthLabel(currentPeriod)}:
- Ingresos totales: $ ${stats.income} ARS
- Gastos totales: $ ${stats.expense} ARS (Fijos: $ ${stats.fixedExpense}, Variables: $ ${stats.variableExpense}, Hormiga: $ ${stats.antExpense})
- Aportes a ahorros: $ ${stats.savingsDeposit} ARS
- Balance neto del mes: $ ${stats.netBalance} ARS
- Tasa de ahorro: ${stats.savingsRate}%
- Variación de gasto respecto al mes anterior: ${stats.expenseDiffPercent}%
- Principales gastos: ${stats.topCategories.map((c) => `${c.name} (${c.percent}%)`).join(', ')}

Por favor elabora:
1. Resumen descriptivo de los números del mes.
2. Observaciones de patrones de consumo y gastos hormiga.
3. Recomendaciones prácticas de optimización de flujo sin realizar promesas de rentabilidad ni asesoramiento legal vinculante.
Mantén un tono profesional, claro, empático y estructurado en viñetas cortas.`;

      const response = await onAskGemini(prompt);
      setAiReport(response);
    } catch (err: any) {
      setAiReport('No fue posible contactar al asistente en este momento. Por favor verifica tu conexión.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-300">
      {/* Header and Print Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#F5F7FC]">Informe Contable Mensual</h2>
          <span className="text-xs text-[#929BAD]">{formatMonthLabel(currentPeriod)}</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171D2B] hover:bg-[#202738] border border-[#262E3D] text-xs font-medium text-[#F5F7FC] transition-colors"
          title="Imprimir informe contable"
        >
          <Printer className="w-3.5 h-3.5 text-[#5687F5]" />
          <span>Imprimir / PDF</span>
        </button>
      </div>

      {/* Comparative Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#929BAD]">Tasa de Ahorro</span>
            <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
          </div>
          <span className="text-2xl font-bold text-[#F5F7FC] block mt-1">
            {stats.savingsRate}%
          </span>
          <span className="text-[11px] text-[#929BAD] mt-0.5 block">Del total ingresado</span>
        </div>

        <div className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#929BAD]">Var. Gasto vs Ant.</span>
            <span
              className={`w-2 h-2 rounded-full ${
                stats.expenseDiffPercent > 0 ? 'bg-[#F87171]' : 'bg-[#4ADE80]'
              }`}
            />
          </div>
          <span
            className={`text-2xl font-bold block mt-1 ${
              stats.expenseDiffPercent > 0 ? 'text-[#F87171]' : 'text-[#4ADE80]'
            }`}
          >
            {stats.expenseDiffPercent > 0 ? `+${stats.expenseDiffPercent}%` : `${stats.expenseDiffPercent}%`}
          </span>
          <span className="text-[11px] text-[#929BAD] mt-0.5 block">vs {formatMonthLabel(prevPeriod)}</span>
        </div>
      </div>

      {/* Comparative Bar Chart: Current vs Previous Month */}
      <div className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#929BAD] mb-3">
          Comparativa Mensual de Flujo
        </h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="period" stroke="#929BAD" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#929BAD"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v) => formatCompactCurrency(v, 'ARS', privacyMode)}
              />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0, 'ARS', privacyMode)]}
                contentStyle={{
                  backgroundColor: '#101522',
                  borderColor: '#262E3D',
                  borderRadius: '14px',
                  color: '#F5F7FC',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#929BAD' }} />
              <Bar dataKey="Ingresos" fill="#4ADE80" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Gastos" fill="#F87171" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Group Distribution Breakdown */}
      {groupPieData.length > 0 && (
        <div className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#929BAD] mb-3">
            Composición del Gasto Mensual
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
            <div className="h-40 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groupPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {groupPieData.map((entry, index) => (
                      <Cell key={`grp-cell-${index}`} fill={entry.color} stroke="#171D2B" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [formatCurrency(Number(v) || 0, 'ARS', privacyMode)]}
                    contentStyle={{
                      backgroundColor: '#101522',
                      borderColor: '#262E3D',
                      borderRadius: '14px',
                      color: '#F5F7FC',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
                  <span className="text-[#F5F7FC]">Gastos Fijos</span>
                </div>
                <span className="font-semibold text-[#F5F7FC]">
                  {formatCurrency(stats.fixedExpense, 'ARS', privacyMode)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]" />
                  <span className="text-[#F5F7FC]">Gastos Variables</span>
                </div>
                <span className="font-semibold text-[#F5F7FC]">
                  {formatCurrency(stats.variableExpense, 'ARS', privacyMode)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D8A4FF]" />
                  <span className="text-[#D8A4FF]">Gastos Hormiga</span>
                </div>
                <span className="font-semibold text-[#D8A4FF]">
                  {formatCurrency(stats.antExpense, 'ARS', privacyMode)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 5 Categories Progress Bars */}
      <div className="p-4 rounded-3xl bg-[#171D2B] border border-[#262E3D]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#929BAD] mb-3">
          Categorías con Mayor Importe
        </h3>
        <div className="space-y-3">
          {stats.topCategories.map((c) => (
            <div key={c.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F5F7FC] font-medium">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#929BAD] text-[11px]">{c.percent}%</span>
                  <span className="font-bold text-[#F5F7FC]">
                    {formatCurrency(c.amount, 'ARS', privacyMode)}
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#101522] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5687F5] to-[#3B82F6]"
                  style={{ width: `${Math.min(c.percent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Google Gemini AI Analysis Box */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-[#171D2B] to-[#101522] border border-[#5687F5]/40 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#5687F5]/20 flex items-center justify-center text-[#5687F5]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F5F7FC]">Observaciones del Contador (IA Gemini)</h3>
              <p className="text-[10px] text-[#929BAD]">Diagnóstico automatizado de patrones de consumo</p>
            </div>
          </div>

          <button
            onClick={handleGenerateAIReport}
            disabled={isGeneratingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5687F5] hover:bg-[#4374E0] active:scale-95 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGeneratingAI ? 'Analizando...' : 'Auditar Mes'}</span>
          </button>
        </div>

        {aiReport ? (
          <div className="mt-3 p-4 rounded-2xl bg-[#080B12]/80 border border-[#262E3D] text-xs text-[#F5F7FC] leading-relaxed whitespace-pre-wrap">
            {aiReport}
            <div className="mt-3 pt-3 border-t border-[#262E3D] flex items-center gap-1.5 text-[10px] text-[#929BAD]">
              <ShieldAlert className="w-3.5 h-3.5 text-[#FBBF24]" />
              <span>Nota: Las observaciones generadas son interpretaciones analíticas descriptivas y no constituyen asesoramiento financiero vinculante.</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#080B12]/40 border border-[#262E3D]/50 text-xs text-[#929BAD] text-center">
            <p>Toca «Auditar Mes» para que el Contador Personal Finora examine tus flujos y detecte oportunidades de optimización.</p>
          </div>
        )}
      </div>
    </div>
  );
};
