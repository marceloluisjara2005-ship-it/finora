import { describe, it, expect } from 'vitest';
import {
  getCurrentMonthPeriod,
  formatMonthLabel,
  getPreviousMonth,
  getNextMonth,
  getDueStatus,
} from '../../src/lib/dates';

describe('Dates, Monthly Periods & Due Calendars', () => {
  it('returns valid YYYY-MM format for current period', () => {
    const period = getCurrentMonthPeriod();
    expect(period).toMatch(/^\d{4}-\d{2}$/);
  });

  it('correctly calculates previous and next month periods across years', () => {
    expect(getPreviousMonth('2026-01')).toBe('2025-12');
    expect(getNextMonth('2025-12')).toBe('2026-01');
    expect(getPreviousMonth('2026-10')).toBe('2026-09');
    expect(getNextMonth('2026-10')).toBe('2026-11');
  });

  it('formats month labels in Spanish', () => {
    const label = formatMonthLabel('2026-10');
    expect(label.toLowerCase()).toContain('octubre');
    expect(label).toContain('2026');
  });

  it('calculates due status urgency accurately', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const statusToday = getDueStatus(todayStr);
    expect(statusToday.label).toBe('Vence hoy');
    expect(statusToday.isUrgent).toBe(true);

    const pastDate = new Date(today.getTime() - 4 * 86400000).toISOString().split('T')[0];
    const statusPast = getDueStatus(pastDate);
    expect(statusPast.label).toContain('Venció');
    expect(statusPast.isUrgent).toBe(true);
  });
});
