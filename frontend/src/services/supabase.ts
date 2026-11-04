import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '../config/env';

export { isSupabaseConfigured };

export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey)
  : null;
