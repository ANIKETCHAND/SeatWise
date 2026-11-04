import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { setAuthToken } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  isAdmin: boolean;
  isFaculty: boolean;
  isExamStaff: boolean;
  isStudent: boolean;
}

const defaultAdminUser: UserProfile = {
  id: 'usr-admin-01',
  email: 'admin@jainuniversity.ac.in',
  role: 'admin',
  full_name: 'Dr. Ramesh Kumar (Dean / Admin)',
  department: 'Computer Science & Engineering',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('seatwise_user');
    return saved ? JSON.parse(saved) : defaultAdminUser;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('seatwise_user', JSON.stringify(user));
      // In dev/demo or connected mode, simulate or pass token
      setAuthToken(`demo-token-${user.role}`);
    } else {
      localStorage.removeItem('seatwise_user');
      setAuthToken(null);
    }
  }, [user]);

  // Hook into Supabase auth changes if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthToken(session.access_token);
        // Load profile
        client
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUser({
                id: data.id,
                email: session.user.email || null,
                role: data.role || 'student',
                full_name: data.full_name || 'University User',
                department: data.department,
              });
            }
          });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setAuthToken(session.access_token);
        } else {
          setAuthToken(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, role: UserRole = 'admin') => {
    setIsLoading(true);
    try {
      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        email,
        role,
        full_name: email.split('@')[0].replace('.', ' ').toUpperCase(),
      };
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setAuthToken(null);
  };

  const switchRole = (role: UserRole) => {
    if (!user) return;
    const names: Record<UserRole, string> = {
      admin: 'Dr. Ramesh Kumar (Administrator)',
      faculty: 'Prof. Ananya Sharma (Faculty)',
      exam_staff: 'S. K. Verma (Exam Superintendent)',
      student: 'Rohit S. (Student - Roll: 23JU0102)',
    };
    setUser({
      ...user,
      role,
      full_name: names[role],
    });
  };

  const role = user?.role || 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        login,
        logout,
        switchRole,
        isAdmin: role === 'admin',
        isFaculty: role === 'faculty',
        isExamStaff: role === 'exam_staff',
        isStudent: role === 'student',
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
