/**
 * Centralized Environment Configuration.
 * 
 * Provides type-safe access to Vite environment variables with graceful
 * fallbacks for local development, offline mode, and production builds.
 */

interface AppEnvironment {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  mode: string;
  isDev: boolean;
  isProd: boolean;
  institutionName: string;
  institutionSubheading: string;
}

const getEnvVar = (key: string, fallback: string = ''): string => {
  try {
    return (import.meta.env[key] as string) || fallback;
  } catch {
    return fallback;
  }
};

export const env: AppEnvironment = {
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', '/api'),
  supabaseUrl: getEnvVar('VITE_SUPABASE_URL', ''),
  supabaseAnonKey: getEnvVar('VITE_SUPABASE_ANON_KEY', ''),
  mode: getEnvVar('MODE', 'development'),
  isDev: import.meta.env.DEV ?? true,
  isProd: import.meta.env.PROD ?? false,
  institutionName: 'Jain (Deemed-to-be University)',
  institutionSubheading: 'Faculty of Engineering and Technology (FET)',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export default env;
