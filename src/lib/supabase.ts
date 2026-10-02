import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Retrieve credentials from environment or localStorage for runtime customization
const getStoredConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('finora_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('finora_supabase_anon_key') || '' : '';

  const url = (envUrl || localUrl).trim();
  const anonKey = (envKey || localKey).trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
  };
};

let currentConfig = getStoredConfig();

let _supabaseClient: SupabaseClient | null = currentConfig.isConfigured
  ? createClient(currentConfig.url, currentConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = currentConfig.isConfigured;
export const supabase = _supabaseClient;

export function getSupabase(): SupabaseClient | null {
  return _supabaseClient;
}

export function saveSupabaseConfig(url: string, anonKey: string): boolean {
  if (typeof window === 'undefined') return false;
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (!cleanUrl || !cleanKey || !cleanUrl.startsWith('http')) {
    return false;
  }

  localStorage.setItem('finora_supabase_url', cleanUrl);
  localStorage.setItem('finora_supabase_anon_key', cleanKey);

  _supabaseClient = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return true;
}

export function clearSupabaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('finora_supabase_url');
  localStorage.removeItem('finora_supabase_anon_key');
  _supabaseClient = null;
}

// Authentication Helpers
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase no está configurado. Por favor ingresa la URL y la Anon Key de tu proyecto.');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: displayName,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase no está configurado. Por favor ingresa la URL y la Anon Key de tu proyecto.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) console.error('[Supabase Auth SignOut Error]:', error);
}

export async function resetPassword(email: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase no está configurado. Por favor ingresa la URL y la Anon Key de tu proyecto.');
  }

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : undefined;

  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) throw error;
  return data;
}

export async function updateUserPassword(newPassword: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

export async function getCurrentSession(): Promise<{ session: Session | null; user: User | null }> {
  const client = getSupabase();
  if (!client) return { session: null, user: null };

  const { data: { session }, error } = await client.auth.getSession();
  if (error || !session) return { session: null, user: null };

  return { session, user: session.user };
}
