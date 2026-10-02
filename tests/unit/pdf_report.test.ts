import { describe, it, expect } from 'vitest';
import { generateFinancialPDFReport } from '../../src/lib/pdfReport';
import type { Category, Transaction } from '../../src/types/finance';

describe('PDF Financial Report Generator', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-super',
      userId: 'usr-1',
      name: 'Supermercado',
      group: 'fixed_expense',
      color: '#FBBF24',
      icon: 'ShoppingCart',
      isArchived: false,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'cat-rest',
      userId: 'usr-1',
      name: 'Restaurantes',
      group: 'variable_expense',
      color: '#60A5FA',
      icon: 'Coffee',
      isArchived: false,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      userId: 'usr-1',
      accountId: 'acc-1',
      categoryId: 'cat-super',
      type: 'expense',
      amount: 45000,
      currency: 'ARS',
      description: 'Compra mensual de víveres',
      occurredAt: '2026-10-02T12:00:00.000Z',
      createdAt: '2026-10-02T12:00:00.000Z',
      updatedAt: '2026-10-02T12:00:00.000Z',
      idempotencyKey: 'tx-1',
      syncStatus: 'synced',
    },
    {
      id: 'tx-2',
      userId: 'usr-1',
      accountId: 'acc-1',
      categoryId: undefined,
      type: 'income',
      amount: 250000,
      currency: 'ARS',
      description: 'Honorarios profesionales',
      occurredAt: '2026-10-01T09:00:00.000Z',
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
      idempotencyKey: 'tx-2',
      syncStatus: 'synced',
    },
  ];

  it('generates a valid jsPDF instance and PDF blob', () => {
    const result = generateFinancialPDFReport({
      currentPeriod: '2026-10',
      currency: 'ARS',
      stats: {
        income: 250000,
        expense: 45000,
        fixedExpense: 45000,
        variableExpense: 0,
        antExpense: 0,
        savingsDeposit: 50000,
        netBalance: 205000,
        savingsRate: 82,
        topCategories: [
          { name: 'Supermercado', amount: 45000, percent: 100 },
        ],
      },
      transactions: mockTransactions,
      categories: mockCategories,
      userName: 'Marcelo Jara',
      userEmail: 'marcelo@ejemplo.com',
      aiReport: 'Observación: El mes presenta una excelente tasa de ahorro del 82%.',
    });

    expect(result).toBeDefined();
    expect(result.fileName).toBe('Finora_Resumen_2026-10.pdf');
    expect(result.doc).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBeGreaterThan(500);
  });
});
