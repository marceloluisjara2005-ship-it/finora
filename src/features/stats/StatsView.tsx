import React, { useState, useMemo, useEffect } from 'react';
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
  FileDown,
  Share2,
  Download,
  X,
  CheckCircle2,
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
import { downloadFinancialPDF, shareFinancialPDF } from '../../lib/pdfReport';

interface StatsViewProps {
  currentPeriod: string;
  transactions: Transaction[];
  categories: Category[];
  privacyMode: boolean;
  onAskGemini: (prompt: string) => Promise<string>;
  currency?: string;
  userName?: string;
  userEmail?: string;
}

export const StatsView: React.FC<StatsViewProps> = ({
  currentPeriod,
  transactions,
  categories,
  privacyMode,
  onAskGemini,
  currency = 'ARS',
  userName = 'Usuario Finora',
  userEmail,
}) => {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // PDF Export Modal State
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string | null>(null);
  const [includeAIReportInPDF, setIncludeAIReportInPDF] = useState(true);

  // Close modal on Escape key
  useEffect(() => {
    if (!showPDFModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPDFModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPDFModal]);

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

  const handleDownloadPDF = () => {
    try {
      setIsExportingPDF(true);
      setPdfStatusMessage(null);
      downloadFinancialPDF({
        currentPeriod,
        currency,
        stats,
        transactions: currentMonthTx,
        categories,
        aiReport: includeAIReportInPDF ? aiReport : null,
        userName,
        userEmail,
      });
      setPdfStatusMessage('¡Resumen en PDF descargado exitosamente!');
      setTimeout(() => {
        setPdfStatusMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Download PDF error:', err);
      setPdfStatusMessage('Ocurrió un error al generar el PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleSharePDF = async () => {
    try {
      setIsExportingPDF(true);
      setPdfStatusMessage(null);
      const shared = await shareFinancialPDF({
        currentPeriod,
        currency,
        stats,
        transactions: currentMonthTx,
        categories,
        aiReport: includeAIReportInPDF ? aiReport : null,
        userName,
        userEmail,
      });
      if (shared) {
        setPdfStatusMessage('¡Documento compartido exitosamente!');
      } else {
        setPdfStatusMessage('PDF descargado al dispositivo para que puedas enviarlo.');
      }
      setTimeout(() => {
        setPdfStatusMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Share PDF error:', err);
      setPdfStatusMessage('No se pudo compartir el archivo.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-300">
      {/* Header and Print/Export Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#F5F7FC]">Informe Contable Mensual</h2>
          <span className="text-xs text-[#929BAD]">{formatMonthLabel(currentPeriod)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPDFModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] active:scale-95 text-white text-xs font-semibold shadow-[0_2px_10px_rgba(86,135,245,0.3)] transition-all cursor-pointer"
            title="Generar resumen en formato PDF para guardar o compartir"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* PDF Export Modal */}
      {showPDFModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPDFModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
        >
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#0E131F] border border-[#1F293D] rounded-3xl p-6 shadow-2xl relative my-auto text-left">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5687F5]/20 border border-[#5687F5]/30 flex items-center justify-center text-[#5687F5] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pdf-modal-title" className="text-base font-bold text-white tracking-tight">
                    Resumen en Formato PDF
                  </h3>
                  <p className="text-xs text-gray-400">{formatMonthLabel(currentPeriod)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPDFModal(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-[#161F33] transition-colors"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Preview Box */}
            <div className="p-3.5 rounded-2xl bg-[#121826] border border-[#1F293D] mb-4 space-y-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Datos incluidos en el informe
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-[#080B12] border border-[#1F293D]">
                  <span className="text-gray-400 block text-[10px]">Ingresos</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(stats.income, currency, privacyMode)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#080B12] border border-[#1F293D]">
                  <span className="text-gray-400 block text-[10px]">Gastos</span>
                  <span className="font-bold text-rose-400">
                    {formatCurrency(stats.expense, currency, privacyMode)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#080B12] border border-[#1F293D]">
                  <span className="text-gray-400 block text-[10px]">Balance Neto</span>
                  <span className={`font-bold ${stats.netBalance >= 0 ? 'text-[#5687F5]' : 'text-rose-400'}`}>
                    {formatCurrency(stats.netBalance, currency, privacyMode)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#080B12] border border-[#1F293D]">
                  <span className="text-gray-400 block text-[10px]">Tasa de Ahorro</span>
                  <span className="font-bold text-white">{stats.savingsRate}%</span>
                </div>
              </div>

              {aiReport && (
                <label className="flex items-center gap-2 pt-1 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAIReportInPDF}
                    onChange={(e) => setIncludeAIReportInPDF(e.target.checked)}
                    className="rounded border-[#1F293D] text-[#5687F5] focus:ring-0"
                  />
                  <span>Incluir observaciones de Auditoría IA</span>
                </label>
              )}
            </div>

            {/* Status Message */}
            {pdfStatusMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 text-xs text-emerald-300 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{pdfStatusMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isExportingPDF}
                onClick={handleDownloadPDF}
                className="w-full py-3 px-4 rounded-xl bg-[#5687F5] hover:bg-[#4374E0] disabled:opacity-50 text-white text-xs font-semibold shadow-[0_2px_10px_rgba(86,135,245,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingPDF ? 'Generando PDF...' : 'Guardar en este dispositivo (PDF)'}</span>
              </button>

              <button
                type="button"
                disabled={isExportingPDF}
                onClick={handleSharePDF}
                className="w-full py-3 px-4 rounded-xl bg-[#161F33] hover:bg-[#202B47] disabled:opacity-50 text-white text-xs font-semibold border border-[#28354D] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#5687F5]" />
                <span>Compartir PDF (WhatsApp / Mail / AirDrop)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPDFModal(false);
                  handlePrint();
                }}
                className="w-full py-2.5 text-center text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir vista contable</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {formatCurrency(stats.fixedExpense, currency, privacyMode)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]" />
                  <span className="text-[#F5F7FC]">Gastos Variables</span>
                </div>
                <span className="font-semibold text-[#F5F7FC]">
                  {formatCurrency(stats.variableExpense, currency, privacyMode)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D8A4FF]" />
                  <span className="text-[#D8A4FF]">Gastos Hormiga</span>
                </div>
                <span className="font-semibold text-[#D8A4FF]">
                  {formatCurrency(stats.antExpense, currency, privacyMode)}
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
                    {formatCurrency(c.amount, currency, privacyMode)}
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
            <div className="mt-3 pt-3 border-t border-[#262E3D] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-[#929BAD]">
                <ShieldAlert className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                <span>Observaciones descriptivas sin validez vinculante.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIncludeAIReportInPDF(true);
                  setShowPDFModal(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5687F5]/20 hover:bg-[#5687F5]/30 text-[#5687F5] text-xs font-semibold shrink-0 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Exportar con Auditoría a PDF</span>
              </button>
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
