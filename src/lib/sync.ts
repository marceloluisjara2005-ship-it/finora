import { db, type OutboxItem } from './db';
import { supabase, isSupabaseConfigured } from './supabase';
import type { Transaction } from '../types/finance';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Enqueue an operation to the local Dexie Outbox
 */
export async function enqueueOutboxOperation(
  action: OutboxItem['action'],
  payload: any,
  idempotencyKey: string
): Promise<void> {
  const item: OutboxItem = {
    id: `outbox-${Math.random().toString(36).substr(2, 9)}`,
    idempotencyKey,
    action,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await db.outbox.add(item);
}

/**
 * Processes all pending outbox queue items
 */
export async function processOutboxQueue(): Promise<SyncResult> {
  const items = await db.outbox.toArray();
  if (items.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    // 1. If Supabase is configured with keys, sync directly to remote PostgreSQL tables
    if (isSupabaseConfigured && supabase) {
      for (const item of items) {
        try {
          if (item.action === 'create_transaction' && item.payload) {
            const tx = item.payload as Transaction;
            await supabase.from('transactions').upsert({
              id: tx.id,
              user_id: tx.userId,
              account_id: tx.accountId,
              category_id: tx.categoryId || null,
              type: tx.type,
              amount: tx.amount,
              currency: tx.currency,
              description: tx.description,
              notes: tx.notes || null,
              payment_method: tx.paymentMethod || null,
              tags: tx.tags || [],
              occurred_at: tx.occurredAt,
              idempotency_key: tx.idempotencyKey || item.idempotencyKey,
              installment_plan_id: tx.installmentPlanId || null,
              installment_number: tx.installmentNumber || null,
              transfer_destination_account_id: tx.transferDestinationAccountId || null,
              savings_goal_id: tx.savingsGoalId || null,
              debt_id: tx.debtId || null,
            });
            await db.transactions.update(tx.id, { syncStatus: 'synced' });
          }
          await db.outbox.delete(item.id);
          syncedCount++;
        } catch (supabaseErr: any) {
          console.warn('[Finora Supabase Sync Item Error]:', supabaseErr);
          await db.outbox.update(item.id, { retryCount: item.retryCount + 1 });
          failedCount++;
        }
      }
    } else {
      // 2. Fallback to server batch endpoint
      const response = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        // Mark all corresponding transactions as synced
        for (const item of items) {
          if (item.action === 'create_transaction' && item.payload?.id) {
            await db.transactions.update(item.payload.id, { syncStatus: 'synced' });
          }
          await db.outbox.delete(item.id);
          syncedCount++;
        }
      } else {
        // Server returned an error, increment retry counts
        for (const item of items) {
          await db.outbox.update(item.id, { retryCount: item.retryCount + 1 });
        }
        failedCount = items.length;
        errors.push('El servidor de sincronización rechazó la solicitud.');
      }
    }
  } catch (err: any) {
    // Network still unavailable or timeout
    failedCount = items.length;
    errors.push(err.message || 'Sin conexión a internet');
  }

  return { syncedCount, failedCount, errors };
}

/**
 * Auto-sync listener that triggers on reconnection
 */
export function initBackgroundSyncListener(onSyncComplete?: (result: SyncResult) => void): () => void {
  const handleOnline = async () => {
    console.log('[Finora Sync] Conexión detectada. Procesando cola outbox...');
    const result = await processOutboxQueue();
    if (result.syncedCount > 0 && onSyncComplete) {
      onSyncComplete(result);
    }
  };

  window.addEventListener('online', handleOnline);

  // Return unsubscribe cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
