import {
  format,
  parseISO,
  subMonths,
  addMonths,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isToday,
  isYesterday,
  differenceInDays,
} from 'date-fns';
import { es } from 'date-fns/locale';

export function getCurrentMonthPeriod(): string {
  return format(new Date(), 'yyyy-MM');
}

export function formatMonthLabel(periodMonth: string): string {
  try {
    const [year, month] = periodMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const label = format(date, 'MMMM yyyy', { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return periodMonth;
  }
}

export function getPreviousMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return format(subMonths(date, 1), 'yyyy-MM');
}

export function getNextMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return format(addMonths(date, 1), 'yyyy-MM');
}

export function formatDateTime(isoString: string): string {
  try {
    const date = parseISO(isoString);
    if (isToday(date)) {
      return `Hoy, ${format(date, 'HH:mm', { locale: es })}`;
    }
    if (isYesterday(date)) {
      return `Ayer, ${format(date, 'HH:mm', { locale: es })}`;
    }
    return format(date, "d 'de' MMM, HH:mm", { locale: es });
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  try {
    const date = parseISO(isoString);
    return format(date, 'dd/MM/yyyy');
  } catch {
    return isoString;
  }
}

export function getDueStatus(dueDateString: string): { label: string; color: string; isUrgent: boolean } {
  try {
    const due = parseISO(dueDateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diff = differenceInDays(due, today);

    if (diff < 0) {
      return { label: `Venció hace ${Math.abs(diff)} d`, color: '#F87171', isUrgent: true };
    }
    if (diff === 0) {
      return { label: 'Vence hoy', color: '#FBBF24', isUrgent: true };
    }
    if (diff <= 3) {
      return { label: `Vence en ${diff} d`, color: '#FBBF24', isUrgent: true };
    }
    return { label: `Vence el ${format(due, 'dd/MM')}`, color: '#929BAD', isUrgent: false };
  } catch {
    return { label: dueDateString, color: '#929BAD', isUrgent: false };
  }
}

export { startOfMonth, endOfMonth, isSameMonth };
