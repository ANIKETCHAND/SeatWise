import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { setAuthToken } from '../services/api/client';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isFaculty: boolean;
  isExamStaff: boolean;
  isStudent: boolean;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  loginWithRollNumber: (rollNumber: string, password: string) => Promise<UserProfile>;
  loginWithIdentifier: (identifier: string, password: string) => Promise<UserProfile>;
  loginWithGoogle: (credential: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  hasPermission: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfileFromBackend = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const data = await api.getMe();
      if (data && data.user_id) {
        const profile: UserProfile = {
          id: data.user_id,
          email: data.email,
          role: data.role as UserRole,
          full_name: data.full_name || 'Authenticated User',
          department: data.department,
          account_status: data.account_status,
          must_change_password: data.must_change_password,
          permissions: data.permissions || [],
        };
        setUser(profile);
        return profile;
      }
    } catch (err: any) {
      console.warn('Backend profile resolution failed:', err.message || err);
    }
    return null;
  }, []);

  // Initialize Supabase Auth session listener
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    const client = supabase;

    // Check active session on initial page load
    client.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.access_token) {
        setAuthToken(session.access_token);
        fetchProfileFromBackend().finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setAuthToken(null);
        setUser(null);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setAuthToken(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    // Listen to real-time authentication state changes
    const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.access_token) {
        setAuthToken(session.access_token);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await fetchProfileFromBackend();
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthToken(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfileFromBackend]);

  const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase authentication is not configured in this environment.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw new Error(error.message || 'Authentication failed. Please check your credentials.');
      }

      if (!data.session) {
        throw new Error('No session established by authentication provider.');
      }

      setAuthToken(data.session.access_token);
      const profile = await fetchProfileFromBackend();

      if (!profile) {
        throw new Error('Authentication succeeded, but failed to load user profile from database.');
      }

      if (profile.account_status === 'deactivated' || profile.account_status === 'suspended') {
        await logout();
        throw new Error('Your account has been deactivated. Please contact an administrator.');
      }

      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithRollNumber = async (rollNumber: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const resolved = await api.resolveStudentRoll(rollNumber.trim());
      if (!resolved?.email) {
        throw new Error('Could not resolve an authenticated email for this roll number.');
      }
      return await loginWithEmail(resolved.email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithIdentifier = async (identifier: string, password: string): Promise<UserProfile> => {
    const clean = identifier.trim();
    if (clean.includes('@')) {
      return await loginWithEmail(clean, password);
    }
    setIsLoading(true);
    try {
      let resolvedEmail: string | null = null;
      try {
        const res = await api.resolveIdentifier(clean);
        if (res?.email) resolvedEmail = res.email;
      } catch {
        try {
          const res = await api.resolveStudentRoll(clean);
          if (res?.email) resolvedEmail = res.email;
        } catch {}
      }

      if (!resolvedEmail) {
        throw new Error('No account found matching this username or roll number.');
      }
      return await loginWithEmail(resolvedEmail, password);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase authentication is not configured.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });

      if (error) {
        throw new Error(error.message || 'Google authentication failed.');
      }

      if (!data.session) {
        throw new Error('Google Sign-In succeeded but no active session was returned.');
      }

      setAuthToken(data.session.access_token);
      const profile = await fetchProfileFromBackend();

      if (!profile) {
        throw new Error('Could not load user profile from database after Google Sign-In.');
      }

      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signOut();
        } catch {}
      }
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.disableAutoSelect();
        } catch {}
      }
      setAuthToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    return await fetchProfileFromBackend();
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Boolean(user.permissions && user.permissions.includes(permissionKey));
  };

  const role = user?.role || null;
  const isAuthenticated = Boolean(user && user.id);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAuthenticated,
        isAdmin: role === 'admin',
        isExamStaff: role === 'exam_staff',
        isFaculty: role === 'faculty',
        isStudent: role === 'student',
        loginWithEmail,
        loginWithRollNumber,
        loginWithIdentifier,
        loginWithGoogle,
        logout,
        refreshProfile,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
