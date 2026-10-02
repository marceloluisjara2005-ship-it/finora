import { parseISO, differenceInDays } from 'date-fns';
import { db, DEFAULT_USER_ID } from './db';
import { formatCurrency } from './currency';
import { formatDateShort } from './dates';
import type { Installment, InstallmentPlan } from '../types/finance';

export interface InstallmentReminderSettings {
  enabled: boolean;
  daysBefore: number; // 0 = El mismo día, 1 = 1 día antes, 2 = 2 días antes, 3 = 3 días antes, 5 = 5 días antes
  time: string; // e.g. "09:00"
  notifyPush: boolean; // Notificaciones locales / push del navegador
  notifyInApp: boolean; // Notificaciones en Centro de Notificaciones de Finora
  customPlanAlerts: Record<string, boolean>; // planId -> activa/desactiva
}

const SETTINGS_KEY = 'finora_installment_reminders_settings';
const DISPATCHED_KEY = 'finora_dispatched_installment_reminders';

export const DEFAULT_REMINDER_SETTINGS: InstallmentReminderSettings = {
  enabled: true,
  daysBefore: 2, // 2 días antes por defecto
  time: '09:00',
  notifyPush: true,
  notifyInApp: true,
  customPlanAlerts: {},
};

export function getInstallmentReminderSettings(): InstallmentReminderSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_REMINDER_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function saveInstallmentReminderSettings(settings: InstallmentReminderSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save reminder settings:', err);
  }
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('Error requesting push permission:', err);
    return 'denied';
  }
}

export async function sendLocalNotification(
  title: string,
  body: string,
  icon = '/pwa-192x192.png'
): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  // 1. Try Service Worker showNotification if active
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          vibrate: [200, 100, 200],
          tag: 'finora-installment-reminder',
        } as NotificationOptions);
        return true;
      }
    } catch {
      // fallback to constructor
    }
  }

  // 2. Direct Window Notification fallback
  try {
    new Notification(title, {
      body,
      icon,
      badge: icon,
    });
    return true;
  } catch (err) {
    console.warn('Notification constructor error:', err);
    return false;
  }
}

function getDispatchedKeys(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISPATCHED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function recordDispatchedKey(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys = getDispatchedKeys();
    keys.add(key);
    // Keep set from growing indefinitely (keep last 300)
    const array = Array.from(keys).slice(-300);
    localStorage.setItem(DISPATCHED_KEY, JSON.stringify(array));
  } catch (err) {
    console.error('Failed to record dispatched key:', err);
  }
}

export interface UpcomingInstallmentInfo {
  plan: InstallmentPlan;
  installment: Installment;
  daysLeft: number;
  formattedDue: string;
  isUrgent: boolean;
  statusLabel: string;
}

/**
 * Evaluates pending installments and returns those that have upcoming due dates
 */
export function getUpcomingInstallments(
  plans: InstallmentPlan[],
  installments: Installment[],
  daysThreshold = 7
): UpcomingInstallmentInfo[] {
  const planMap = new Map<string, InstallmentPlan>();
  plans.forEach((p) => planMap.set(p.id, p));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: UpcomingInstallmentInfo[] = [];

  for (const inst of installments) {
    if (inst.status === 'paid') continue;
    const plan = planMap.get(inst.planId);
    if (!plan || plan.status === 'completed' || plan.status === 'cancelled') continue;

    try {
      const due = parseISO(inst.dueDate);
      due.setHours(0, 0, 0, 0);
      const diff = differenceInDays(due, today);

      if (diff <= daysThreshold) {
        let statusLabel = '';
        if (diff < 0) statusLabel = `Vencida hace ${Math.abs(diff)} d`;
        else if (diff === 0) statusLabel = '¡Vence hoy!';
        else if (diff === 1) statusLabel = 'Vence mañana';
        else statusLabel = `Vence en ${diff} días`;

        results.push({
          plan,
          installment: inst,
          daysLeft: diff,
          formattedDue: formatDateShort(inst.dueDate),
          isUrgent: diff <= 2,
          statusLabel,
        });
      }
    } catch {
      // invalid date
    }
  }

  // Sort: most urgent first (overdue, today, soon)
  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * Checks pending installments and dispatches reminders according to user preferences
 */
export async function checkAndDispatchInstallmentReminders(
  plans: InstallmentPlan[],
  installments: Installment[],
  currency = 'ARS'
): Promise<{ dispatched: number; upcomingCount: number }> {
  const settings = getInstallmentReminderSettings();
  if (!settings.enabled) {
    return { dispatched: 0, upcomingCount: 0 };
  }

  const upcoming = getUpcomingInstallments(plans, installments, 14);
  const dispatchedKeys = getDispatchedKeys();
  let dispatched = 0;

  for (const item of upcoming) {
    const { plan, installment, daysLeft } = item;

    // Check if this plan has alerts disabled specifically
    if (settings.customPlanAlerts[plan.id] === false) {
      continue;
    }

    // Remind if daysLeft is within configured window (e.g. <= 2 days)
    if (daysLeft <= settings.daysBefore && daysLeft >= -1) {
      const dispatchKey = `${installment.id}_${installment.dueDate}_alert_${settings.daysBefore}d`;
      if (dispatchedKeys.has(dispatchKey)) {
        continue;
      }

      const formattedAmount = formatCurrency(installment.amount, currency, false);
      let urgencyText = '';
      if (daysLeft === 0) urgencyText = '¡Vence HOY!';
      else if (daysLeft === 1) urgencyText = 'Vence mañana';
      else if (daysLeft < 0) urgencyText = '¡Está vencida!';
      else urgencyText = `Vence en ${daysLeft} días`;

      const title = `Recordatorio de Cuota: ${plan.description}`;
      const message = `${urgencyText}. Cuota #${installment.installmentNumber}/${installment.totalInstallments} de ${formattedAmount} (Vencimiento: ${item.formattedDue}).`;

      // 1. Send Local / Push browser notification
      if (settings.notifyPush && isPushSupported() && Notification.permission === 'granted') {
        await sendLocalNotification(title, message);
      }

      // 2. Add to Finora In-App Notification Center
      if (settings.notifyInApp) {
        try {
          await db.notifications.add({
            id: `notif-inst-${installment.id}-${Date.now()}`,
            userId: DEFAULT_USER_ID,
            title,
            message,
            type: daysLeft <= 0 ? 'error' : 'warning',
            read: false,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not insert in-app notification:', e);
        }
      }

      recordDispatchedKey(dispatchKey);
      dispatched++;
    }
  }

  return { dispatched, upcomingCount: upcoming.length };
}

/**
 * Triggers a manual test notification to verify push and local alerts
 */
export async function testSampleInstallmentReminder(
  samplePlanName = 'Notebook / Tarjeta Visa',
  amount = 35000,
  currency = 'ARS'
): Promise<{ pushSent: boolean; inAppSent: boolean; message: string }> {
  const settings = getInstallmentReminderSettings();
  const formattedAmount = formatCurrency(amount, currency, false);
  const title = `Recordatorio de Cuota: ${samplePlanName}`;
  const body = `Prueba de recordatorio exitosa. Tu cuota #3/6 de ${formattedAmount} vence en 2 días. ¡Todo listo para avisarte a tiempo!`;

  let pushSent = false;
  let inAppSent = false;

  if (settings.notifyPush) {
    if (isPushSupported()) {
      if (Notification.permission !== 'granted') {
        const perm = await requestPushPermission();
        if (perm === 'granted') {
          pushSent = await sendLocalNotification(title, body);
        }
      } else {
        pushSent = await sendLocalNotification(title, body);
      }
    }
  }

  if (settings.notifyInApp) {
    try {
      await db.notifications.add({
        id: `notif-test-${Date.now()}`,
        userId: DEFAULT_USER_ID,
        title,
        message: body,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
      });
      inAppSent = true;
    } catch {
      inAppSent = false;
    }
  }

  let message = '';
  if (pushSent && inAppSent) {
    message = '¡Recordatorio enviado por notificación del sistema y registrado en el Centro de Notificaciones!';
  } else if (pushSent) {
    message = '¡Notificación local enviada a tu dispositivo!';
  } else if (inAppSent) {
    message = 'Notificación guardada en el Centro de Notificaciones de Finora (revisa la campana superior).';
  } else {
    message = 'Por favor habilita los permisos de notificaciones en tu navegador para recibir alertas en pantalla.';
  }

  return { pushSent, inAppSent, message };
}
