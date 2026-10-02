import { jsPDF } from 'jspdf';
import { formatCurrency } from './currency';
import { formatMonthLabel } from './dates';
import type { Transaction, Category } from '../types/finance';

export interface PDFReportOptions {
  currentPeriod: string;
  currency?: string;
  stats: {
    income: number;
    expense: number;
    fixedExpense: number;
    variableExpense: number;
    antExpense: number;
    savingsDeposit: number;
    netBalance: number;
    savingsRate: number;
    prevPeriod?: string;
    prevIncome?: number;
    prevExpense?: number;
    expenseDiffPercent?: number;
    topCategories: Array<{
      name: string;
      amount: number;
      percent: number;
    }>;
  };
  transactions: Transaction[];
  categories: Category[];
  aiReport?: string | null;
  userName?: string;
  userEmail?: string;
}

export function generateFinancialPDFReport(options: PDFReportOptions): {
  doc: jsPDF;
  blob: Blob;
  fileName: string;
} {
  const {
    currentPeriod,
    currency = 'ARS',
    stats,
    transactions,
    categories,
    aiReport,
    userName = 'Usuario Finora',
    userEmail,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const periodLabel = formatMonthLabel(currentPeriod);
  const fileName = `Finora_Resumen_${currentPeriod}.pdf`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 14;

  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  // --- HEADER BANNER ---
  doc.setFillColor(14, 19, 31); // #0E131F Dark Navy
  doc.roundedRect(margin, currentY, contentWidth, 24, 3, 3, 'F');

  // Finora Brand Logo Accent
  doc.setFillColor(86, 135, 245); // #5687F5 Blue
  doc.roundedRect(margin + 4, currentY + 4, 16, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('F', margin + 9.5, currentY + 15);

  // App Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FINORA', margin + 24, currentY + 10);

  doc.setTextColor(156, 163, 175);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Contador Personal & Finanzas Personales', margin + 24, currentY + 16);

  // Period Badge on top-right
  doc.setFillColor(31, 41, 61);
  doc.roundedRect(pageWidth - margin - 48, currentY + 6, 44, 12, 2, 2, 'F');
  doc.setTextColor(86, 135, 245);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PERÍODO ANALIZADO', pageWidth - margin - 46, currentY + 11);
  doc.setTextColor(255, 255, 255);
  doc.text(periodLabel.toUpperCase(), pageWidth - margin - 46, currentY + 15.5);

  currentY += 30;

  // --- USER & METADATA LINE ---
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const nowStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Titular: ${userName}${userEmail ? ` (${userEmail})` : ''}`, margin, currentY);
  doc.text(`Generado: ${nowStr} • Moneda: ${currency}`, pageWidth - margin, currentY, { align: 'right' });

  currentY += 6;

  // Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // --- SECTION TITLE: RESUMEN EJECUTIVO ---
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Resumen Ejecutivo del Mes', margin, currentY);

  currentY += 5;

  // --- 4 KPI SUMMARY CARDS ---
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 20;

  // Card 1: Ingresos
  doc.setFillColor(240, 253, 244); // light green
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text('Ingresos Totales', margin + 3, currentY + 5.5);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text(formatCurrency(stats.income, currency, false), margin + 3, currentY + 12.5);

  // Card 2: Gastos
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(254, 242, 242); // light red
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(c2X, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(153, 27, 27);
  doc.text('Gastos Totales', c2X + 3, currentY + 5.5);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text(formatCurrency(stats.expense, currency, false), c2X + 3, currentY + 12.5);

  // Card 3: Balance Neto
  const c3X = margin + (cardWidth + 3) * 2;
  const isPositiveNet = stats.netBalance >= 0;
  doc.setFillColor(isPositiveNet ? 239 : 254, isPositiveNet ? 246 : 242, isPositiveNet ? 255 : 242);
  doc.setDrawColor(isPositiveNet ? 191 : 254, isPositiveNet ? 219 : 202, isPositiveNet ? 254 : 202);
  doc.roundedRect(c3X, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(isPositiveNet ? 30 : 153, isPositiveNet ? 58 : 27, isPositiveNet ? 138 : 27);
  doc.text(isPositiveNet ? 'Superávit Neto' : 'Déficit del Mes', c3X + 3, currentY + 5.5);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPositiveNet ? 37 : 185, isPositiveNet ? 99 : 28, isPositiveNet ? 235 : 28);
  doc.text(formatCurrency(stats.netBalance, currency, false), c3X + 3, currentY + 12.5);

  // Card 4: Tasa de Ahorro
  const c4X = margin + (cardWidth + 3) * 3;
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(c4X, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text('Tasa de Ahorro', c4X + 3, currentY + 5.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`${stats.savingsRate}%`, c4X + 3, currentY + 12.5);

  currentY += cardHeight + 8;

  // --- SECTION 2: ESTRUCTURA DEL GASTO ---
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Desglose y Calidad de Gastos', margin, currentY);

  currentY += 5;

  // Table of Expenses Breakdown
  const expenseRows = [
    {
      type: 'Gastos Fijos (Esenciales)',
      desc: 'Alquiler, servicios, seguros, suscripciones recurrentes',
      amount: stats.fixedExpense,
      percent: stats.expense > 0 ? Math.round((stats.fixedExpense / stats.expense) * 100) : 0,
    },
    {
      type: 'Gastos Variables (Estilo de Vida)',
      desc: 'Salidas, compras, ocio, viajes e imprevistos',
      amount: stats.variableExpense,
      percent: stats.expense > 0 ? Math.round((stats.variableExpense / stats.expense) * 100) : 0,
    },
    {
      type: 'Gastos Hormiga (Micro-gastos)',
      desc: 'Cafés, snacks, delivery, pequeños consumos diarios',
      amount: stats.antExpense,
      percent: stats.expense > 0 ? Math.round((stats.antExpense / stats.expense) * 100) : 0,
    },
    {
      type: 'Aportes a Fondos de Ahorro',
      desc: 'Depósitos y reservas destinadas a metas de ahorro',
      amount: stats.savingsDeposit,
      percent: stats.income > 0 ? Math.round((stats.savingsDeposit / stats.income) * 100) : 0,
    },
  ];

  // Table header
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(75, 85, 99);
  doc.text('CLASIFICACIÓN', margin + 3, currentY + 4.2);
  doc.text('DESCRIPCIÓN', margin + 55, currentY + 4.2);
  doc.text('MONTO', pageWidth - margin - 32, currentY + 4.2, { align: 'right' });
  doc.text('% GASTO', pageWidth - margin - 4, currentY + 4.2, { align: 'right' });

  currentY += 6;

  expenseRows.forEach((row, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY, contentWidth, 6.5, 'F');
    }
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(row.type, margin + 3, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(row.desc, margin + 55, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(formatCurrency(row.amount, currency, false), pageWidth - margin - 32, currentY + 4.5, { align: 'right' });

    doc.setTextColor(75, 85, 99);
    doc.text(`${row.percent}%`, pageWidth - margin - 4, currentY + 4.5, { align: 'right' });

    currentY += 6.5;
  });

  currentY += 7;

  // --- SECTION 3: TOP 5 CATEGORÍAS DE GASTO ---
  if (stats.topCategories && stats.topCategories.length > 0) {
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Principales Categorías de Consumo', margin, currentY);

    currentY += 5;

    // Header
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text('#', margin + 3, currentY + 4.2);
    doc.text('CATEGORÍA', margin + 12, currentY + 4.2);
    doc.text('IMPORTE', pageWidth - margin - 32, currentY + 4.2, { align: 'right' });
    doc.text('% DEL TOTAL', pageWidth - margin - 4, currentY + 4.2, { align: 'right' });

    currentY += 6;

    stats.topCategories.forEach((cat, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, currentY, contentWidth, 6, 'F');
      }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(86, 135, 245);
      doc.text(`${idx + 1}`, margin + 3, currentY + 4.2);

      doc.setTextColor(17, 24, 39);
      doc.text(cat.name, margin + 12, currentY + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(cat.amount, currency, false), pageWidth - margin - 32, currentY + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`${cat.percent}%`, pageWidth - margin - 4, currentY + 4.2, { align: 'right' });

      currentY += 6;
    });

    currentY += 7;
  }

  // --- SECTION 4: AI FINANCIAL ADVICE OR SUMMARY OBSERVATION ---
  if (aiReport && aiReport.trim().length > 0) {
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 16;
    }

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Análisis y Observaciones del Contador Personal', margin, currentY);

    currentY += 5;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);

    // Clean AI text to fit
    const cleanLines = doc.splitTextToSize(aiReport.replace(/\*\*/g, ''), contentWidth - 8);
    const boxHeight = Math.min(cleanLines.length * 3.8 + 8, 70);

    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(cleanLines.slice(0, 16), margin + 4, currentY + 6);

    currentY += boxHeight + 8;
  }

  // --- SECTION 5: RECENT TRANSACTIONS (Top 8 for page fit) ---
  if (currentY < pageHeight - 45 && transactions.length > 0) {
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Registro Selecto de Transacciones del Mes', margin, currentY);

    currentY += 5;

    doc.setFillColor(243, 244, 246);
    doc.rect(margin, currentY, contentWidth, 5.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text('FECHA', margin + 3, currentY + 3.8);
    doc.text('DESCRIPCIÓN', margin + 26, currentY + 3.8);
    doc.text('CATEGORÍA', margin + 90, currentY + 3.8);
    doc.text('MONTO', pageWidth - margin - 4, currentY + 3.8, { align: 'right' });

    currentY += 5.5;

    const sampleTx = transactions.slice(0, 7);
    sampleTx.forEach((tx, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, currentY, contentWidth, 5.5, 'F');
      }

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      const dStr = tx.occurredAt.split('T')[0];
      doc.text(dStr, margin + 3, currentY + 3.8);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      const desc = tx.description.length > 35 ? `${tx.description.substring(0, 32)}...` : tx.description;
      doc.text(desc, margin + 26, currentY + 3.8);

      const catName = tx.categoryId ? categoryMap.get(tx.categoryId) || 'Otros' : 'General';
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(catName, margin + 90, currentY + 3.8);

      const isInc = tx.type === 'income';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isInc ? 21 : 185, isInc ? 128 : 28, isInc ? 61 : 28);
      const sign = isInc ? '+' : '-';
      doc.text(`${sign}${formatCurrency(tx.amount, currency, false)}`, pageWidth - margin - 4, currentY + 3.8, {
        align: 'right',
      });

      currentY += 5.5;
    });
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text('Finora • Documento Confidencial de Finanzas Personales', margin, pageHeight - 8);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const blob = doc.output('blob');
  return { doc, blob, fileName };
}

export function downloadFinancialPDF(options: PDFReportOptions): void {
  const { doc, fileName } = generateFinancialPDFReport(options);
  doc.save(fileName);
}

export async function shareFinancialPDF(options: PDFReportOptions): Promise<boolean> {
  const { blob, fileName } = generateFinancialPDFReport(options);
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Resumen Financiero Finora - ${formatMonthLabel(options.currentPeriod)}`,
        text: `Te comparto mi resumen contable del período ${formatMonthLabel(options.currentPeriod)}. Generado con Finora.`,
        files: [file],
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return true;
      }
      console.warn('Native share failed or dismissed, falling back to download:', err);
    }
  }

  // Fallback if Web Share is not supported or rejected
  downloadFinancialPDF(options);
  return false;
}
