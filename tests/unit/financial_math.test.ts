import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrencyInput } from '../../src/lib/currency';

describe('Financial Math & Accounting Rules', () => {
  describe('Exact Installment Rounding Algorithm', () => {
    function calculateInstallments(totalAmount: number, count: number): number[] {
      const baseAmount = Math.floor((totalAmount * 100) / count) / 100;
      const remainder = Math.round((totalAmount - baseAmount * count) * 100) / 100;

      const results: number[] = [];
      for (let i = 1; i <= count; i++) {
        // Last installment absorbs the rounding residue
        const amount = i === count ? Math.round((baseAmount + remainder) * 100) / 100 : baseAmount;
        results.push(amount);
      }
      return results;
    }

    it('should divide $1000 into 3 installments without losing or gaining any cent', () => {
      const installments = calculateInstallments(1000, 3);
      expect(installments).toHaveLength(3);
      expect(installments[0]).toBe(333.33);
      expect(installments[1]).toBe(333.33);
      expect(installments[2]).toBe(333.34);

      const sum = installments.reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 100) / 100).toBe(1000.0);
    });

    it('should divide $100 into 6 installments with exact precision', () => {
      const installments = calculateInstallments(100, 6);
      expect(installments).toHaveLength(6);
      const sum = installments.reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 100) / 100).toBe(100.0);
    });

    it('should divide $75432.19 into 12 installments exactly', () => {
      const total = 75432.19;
      const installments = calculateInstallments(total, 12);
      expect(installments).toHaveLength(12);
      const sum = installments.reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 100) / 100).toBe(total);
    });
  });

  describe('Non-duplication in Cash Flow Accounting', () => {
    it('transfers between own accounts must have zero net impact on period balance', () => {
      const transactions = [
        { type: 'income', amount: 500000 },
        { type: 'expense', amount: 150000 },
        { type: 'transfer', amount: 80000 }, // Transfer to savings/other account
      ];

      // Net period result must only count income - expense
      let netBalance = 0;
      for (const t of transactions) {
        if (t.type === 'income') netBalance += t.amount;
        if (t.type === 'expense') netBalance -= t.amount;
        // transfers do not alter global net profit/loss
      }

      expect(netBalance).toBe(350000);
    });

    it('savings deposits should not be treated as consumed expenses in profit/loss', () => {
      const transactions = [
        { type: 'income', amount: 600000 },
        { type: 'expense', amount: 200000 },
        { type: 'savings_deposit', amount: 100000 },
      ];

      let operationalExpenses = 0;
      let savingsAccumulated = 0;

      for (const t of transactions) {
        if (t.type === 'expense') operationalExpenses += t.amount;
        if (t.type === 'savings_deposit') savingsAccumulated += t.amount;
      }

      expect(operationalExpenses).toBe(200000);
      expect(savingsAccumulated).toBe(100000);
    });
  });

  describe('Currency Formatting & Privacy', () => {
    it('masks amount correctly when privacy mode is enabled', () => {
      expect(formatCurrency(450000, 'ARS', true)).toBe('$ ••••••');
      expect(formatCurrency(1200, 'USD', true)).toBe('US$ ••••••');
      expect(formatCurrency(950, 'EUR', true)).toBe('€ ••••••');
    });

    it('formats ARS, USD and EUR currencies with valid symbols and separators', () => {
      const formattedArs = formatCurrency(1250000, 'ARS', false);
      expect(formattedArs).toContain('$');
      expect(formattedArs).toContain('1.250.000');

      const formattedUsd = formatCurrency(2500, 'USD', false);
      expect(formattedUsd).toContain('2,500');

      const formattedEur = formatCurrency(1800, 'EUR', false);
      expect(formattedEur).toContain('€');
      expect(formattedEur).toContain('1800');
    });

    it('parses currency strings into exact numbers', () => {
      expect(parseCurrencyInput('1250000,50')).toBe(1250000.5);
      expect(parseCurrencyInput('1.250.000')).toBe(1250000);
      expect(parseCurrencyInput('')).toBe(0);
    });
  });
});
