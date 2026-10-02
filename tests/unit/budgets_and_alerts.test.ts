import { describe, it, expect } from 'vitest';

describe('Budgets & Alert Thresholds Engine', () => {
  interface BudgetModel {
    id: string;
    limitAmount: number;
    spentAmount: number;
    alertLevelTriggered: number;
  }

  function evaluateBudgetAlert(
    budget: BudgetModel,
    newExpense: number
  ): { nextAlertLevel: number; shouldEmitNotification: boolean; level: number } {
    const newSpent = budget.spentAmount + newExpense;
    const percent = Math.round((newSpent / budget.limitAmount) * 100);

    let triggeredLevel = 0;
    if (percent >= 100) triggeredLevel = 100;
    else if (percent >= 90) triggeredLevel = 90;
    else if (percent >= 70) triggeredLevel = 70;

    const shouldEmitNotification = triggeredLevel > 0 && triggeredLevel > budget.alertLevelTriggered;

    return {
      nextAlertLevel: Math.max(budget.alertLevelTriggered, triggeredLevel),
      shouldEmitNotification,
      level: triggeredLevel,
    };
  }

  it('triggers 70% preventive alert when expense reaches 70%', () => {
    const budget: BudgetModel = {
      id: 'bgt-1',
      limitAmount: 100000,
      spentAmount: 65000,
      alertLevelTriggered: 0,
    };

    const result = evaluateBudgetAlert(budget, 6000); // 71,000 / 100,000 = 71%
    expect(result.shouldEmitNotification).toBe(true);
    expect(result.level).toBe(70);
    expect(result.nextAlertLevel).toBe(70);
  });

  it('does NOT re-trigger 70% alert if already triggered at that level (idempotent)', () => {
    const budget: BudgetModel = {
      id: 'bgt-1',
      limitAmount: 100000,
      spentAmount: 72000,
      alertLevelTriggered: 70, // Already triggered 70%
    };

    const result = evaluateBudgetAlert(budget, 3000); // 75,000 / 100,000 = 75%
    expect(result.shouldEmitNotification).toBe(false); // should not repeat
  });

  it('escalates to 90% alert when spending crosses 90%', () => {
    const budget: BudgetModel = {
      id: 'bgt-1',
      limitAmount: 100000,
      spentAmount: 75000,
      alertLevelTriggered: 70,
    };

    const result = evaluateBudgetAlert(budget, 16000); // 91,000 / 100,000 = 91%
    expect(result.shouldEmitNotification).toBe(true);
    expect(result.level).toBe(90);
    expect(result.nextAlertLevel).toBe(90);
  });

  it('triggers 100% exceeded alert when spending reaches or exceeds 100%', () => {
    const budget: BudgetModel = {
      id: 'bgt-1',
      limitAmount: 100000,
      spentAmount: 92000,
      alertLevelTriggered: 90,
    };

    const result = evaluateBudgetAlert(budget, 10000); // 102,000 / 100,000 = 102%
    expect(result.shouldEmitNotification).toBe(true);
    expect(result.level).toBe(100);
    expect(result.nextAlertLevel).toBe(100);
  });
});
