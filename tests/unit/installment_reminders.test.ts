import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getInstallmentReminderSettings,
  saveInstallmentReminderSettings,
  getUpcomingInstallments,
} from '../../src/lib/installmentReminders';
import type { InstallmentPlan, Installment } from '../../src/types/finance';

// Mock localStorage for node test runner
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

describe('Installment Reminders Utility', () => {
  beforeEach(() => {
    store.clear();
    vi.restoreAllMocks();
  });

  it('reads and saves reminder settings correctly in localStorage', () => {
    const defaultSettings = getInstallmentReminderSettings();
    expect(defaultSettings.enabled).toBe(true);
    expect(defaultSettings.daysBefore).toBe(2);

    saveInstallmentReminderSettings({
      ...defaultSettings,
      enabled: false,
      daysBefore: 3,
      notifyPush: true,
      notifyInApp: false,
    });

    const updated = getInstallmentReminderSettings();
    expect(updated.enabled).toBe(false);
    expect(updated.daysBefore).toBe(3);
    expect(updated.notifyInApp).toBe(false);
  });

  it('detects upcoming installments within specified threshold and computes urgency', () => {
    const today = new Date();
    const inTwoDays = new Date(today);
    inTwoDays.setDate(today.getDate() + 2);
    const inTenDays = new Date(today);
    inTenDays.setDate(today.getDate() + 10);

    const mockPlans: InstallmentPlan[] = [
      {
        id: 'plan-1',
        userId: 'usr-1',
        description: 'Notebook Gamer',
        totalAmount: 300000,
        installmentsCount: 6,
        periodicity: 'monthly',
        firstDueDate: inTwoDays.toISOString().split('T')[0],
        categoryId: 'cat-tech',
        accountId: 'acc-1',
        status: 'active',
        createdAt: today.toISOString(),
      },
      {
        id: 'plan-2',
        userId: 'usr-1',
        description: 'Lavarropas',
        totalAmount: 180000,
        installmentsCount: 3,
        periodicity: 'monthly',
        firstDueDate: inTenDays.toISOString().split('T')[0],
        categoryId: 'cat-home',
        accountId: 'acc-1',
        status: 'active',
        createdAt: today.toISOString(),
      },
    ];

    const mockInstallments: Installment[] = [
      {
        id: 'inst-1',
        planId: 'plan-1',
        installmentNumber: 1,
        totalInstallments: 6,
        amount: 50000,
        dueDate: inTwoDays.toISOString().split('T')[0],
        status: 'pending',
      },
      {
        id: 'inst-2',
        planId: 'plan-2',
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 60000,
        dueDate: inTenDays.toISOString().split('T')[0],
        status: 'pending',
      },
    ];

    // Filter within 5 days
    const upcoming = getUpcomingInstallments(mockPlans, mockInstallments, 5);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].plan.id).toBe('plan-1');
    expect(upcoming[0].daysLeft).toBe(2);
    expect(upcoming[0].isUrgent).toBe(true);

    // Filter within 14 days
    const allUpcoming = getUpcomingInstallments(mockPlans, mockInstallments, 14);
    expect(allUpcoming).toHaveLength(2);
  });
});
