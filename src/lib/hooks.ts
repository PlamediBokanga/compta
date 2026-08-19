import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type {
  AccountingTask,
  AppNotification,
  CatalogItem,
  Category,
  Customer,
  Declaration,
  Invoice,
  Transaction,
} from './types';

export function useTransactions() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .order('date', { ascending: false })
        .limit(200);
      if (!active) return;
      if (error) {
        console.warn('transactions load', error.message);
      }
      setItems((data as Transaction[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { items, loading, reload: () => setReloadKey((k) => k + 1) };
}

export function useCategories() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('kind')
        .order('label');
      if (!active) return;
      if (error) console.warn('categories load', error.message);
      setItems((data as Category[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { items, loading, reload: () => setReloadKey((k) => k + 1) };
}

export function useCustomers() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (!active) return;
      if (error) console.warn('customers load', error.message);
      setItems((data as Customer[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { items, loading, reload: () => setReloadKey((k) => k + 1) };
}

export function useCatalogItems() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .order('name');
      if (!active) return;
      if (error) console.warn('catalog items load', error.message);
      setItems((data as CatalogItem[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { items, loading, reload: () => setReloadKey((k) => k + 1) };
}

export function useInvoices() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, items:invoice_items(*)')
        .order('issue_date', { ascending: false });
      if (!active) return;
      if (error) console.warn('invoices load', error.message);
      setItems((data as Invoice[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { items, loading, reload: () => setReloadKey((k) => k + 1) };
}

export function useDeclarations() {
  const [items, setItems] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('declarations')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (!active) return;
      if (error) console.warn('declarations load', error.message);
      setItems((data as Declaration[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { items, loading, reload: () => setReloadKey((k) => k + 1) };
}

export function useTasks() {
  const [items, setItems] = useState<AccountingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('done')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (!active) return;
      if (error) console.warn('tasks load', error.message);
      setItems((data as AccountingTask[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { items, loading, reload: () => setReloadKey((k) => k + 1) };
}

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!active) return;
      if (error) console.warn('notifications load', error.message);
      setItems((data as AppNotification[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { items, loading, reload: () => setReloadKey((k) => k + 1) };
}
