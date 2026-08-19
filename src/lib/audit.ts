import { supabase } from './supabase';

export async function logAction(
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata: metadata ?? null,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('audit log failed', e);
  }
}

export async function fetchAuditLogs(limit = 50): Promise<import('./types').AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as import('./types').AuditLog[]) ?? [];
}
