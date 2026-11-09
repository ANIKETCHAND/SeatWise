import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { setAuthToken } from '../services/api';
import { parseGoogleJwt } from '../services/googleAuth';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: (credential: string, preferredRole?: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  isAdmin: boolean;
  isFaculty: boolean;
  isExamStaff: boolean;
  isStudent: boolean;
}

export const ROLE_PROFILES: Record<UserRole, UserProfile> = {
  admin: {
    id: 'usr-admin-01',
    email: 'admin@jainuniversity.ac.in',
    role: 'admin',
    full_name: 'Dr. Ramesh Kumar (Administrator)',
    department: 'Computer Science & Engineering',
  },
  faculty: {
    id: 'usr-fac-01',
    email: 'ananya.sharma@jainuniversity.ac.in',
    role: 'faculty',
    full_name: 'Prof. Ananya Sharma (Faculty)',
    department: 'Information Science & Engineering',
  },
  exam_staff: {
    id: 'usr-staff-01',
    email: 'exam.cell@jainuniversity.ac.in',
    role: 'exam_staff',
    full_name: 'S. K. Verma (Exam Superintendent)',
    department: 'Examination Section',
  },
  student: {
    id: 'usr-stud-01',
    email: 'rohit.s@jainuniversity.ac.in',
    role: 'student',
    full_name: 'Rohit S. (Student - Roll: 23JU0102)',
    department: 'Computer Science & Engineering',
    roll_number: '23JU0102',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const savedRole = localStorage.getItem('seatwise_role') as UserRole;
      if (savedRole && ['admin', 'faculty', 'exam_staff', 'student'].includes(savedRole)) {
        return savedRole;
      }
      const savedUser = localStorage.getItem('seatwise_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.role && ['admin', 'faculty', 'exam_staff', 'student'].includes(parsed.role)) {
          return parsed.role;
        }
      }
    } catch {}
    return 'admin';
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('seatwise_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) return parsed;
      }
    } catch {}
    return ROLE_PROFILES[currentRole] || ROLE_PROFILES.admin;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('seatwise_user', JSON.stringify(user));
      localStorage.setItem('seatwise_role', user.role);
      setAuthToken(`demo-token-${user.role}`);
    } else {
      const fallbackRole = (localStorage.getItem('seatwise_role') as UserRole) || currentRole || 'admin';
      setAuthToken(`demo-token-${fallbackRole}`);
    }
  }, [user, currentRole]);

  // Hook into Supabase auth changes if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Ensure initial token is set for demo / local mode
      const activeRole = (localStorage.getItem('seatwise_role') as UserRole) || currentRole || 'admin';
      setAuthToken(`demo-token-${activeRole}`);
      return;
    }
    const client = supabase;

    client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthToken(session.access_token);
        client
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(
            ({ data }) => {
              if (data && data.role) {
                const matchedRole = data.role as UserRole;
                setCurrentRole(matchedRole);
                setUser({
                  id: data.id,
                  email: session.user.email || null,
                  role: matchedRole,
                  full_name: data.full_name || 'University User',
                  department: data.department,
                });
              }
            },
            () => {
              // Keep current profile if database read fails
            }
          );
      } else {
        const activeRole = (localStorage.getItem('seatwise_role') as UserRole) || currentRole || 'admin';
        setAuthToken(`demo-token-${activeRole}`);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setAuthToken(session.access_token);
        } else {
          const activeRole = (localStorage.getItem('seatwise_role') as UserRole) || currentRole || 'admin';
          setAuthToken(`demo-token-${activeRole}`);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [currentRole]);

  const login = async (email: string, role: UserRole = 'admin') => {
    setIsLoading(true);
    try {
      const targetProfile = ROLE_PROFILES[role] || {
        id: `usr-${Date.now()}`,
        email,
        role,
        full_name: email.split('@')[0].replace('.', ' ').toUpperCase(),
      };
      setCurrentRole(role);
      setUser(targetProfile);
      localStorage.setItem('seatwise_role', role);
      localStorage.setItem('seatwise_user', JSON.stringify(targetProfile));
      setAuthToken(`demo-token-${role}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string, preferredRole?: UserRole): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const payload = parseGoogleJwt(credential);
      if (!payload) {
        throw new Error('Could not parse Google ID token credential.');
      }

      // Determine initial role: use override if specified, otherwise deduce from email or current role
      let targetRole: UserRole = preferredRole || currentRole || 'admin';
      const email = (payload.email || '').toLowerCase();
      if (!preferredRole) {
        if (email.includes('admin') || email.includes('dean')) {
          targetRole = 'admin';
        } else if (email.includes('faculty') || email.includes('prof')) {
          targetRole = 'faculty';
        } else if (email.includes('exam') || email.includes('staff')) {
          targetRole = 'exam_staff';
        } else if (email.includes('student') || /\d{2}[a-z]{2}\d{4}/.test(email)) {
          targetRole = 'student';
        }
      }

      const googleProfile: UserProfile = {
        id: `usr-google-${payload.sub}`,
        email: payload.email,
        role: targetRole,
        full_name: payload.name || 'Google User',
        avatar_url: payload.picture,
        department: 'School of Engineering and Technology',
      };

      setCurrentRole(targetRole);
      setUser(googleProfile);
      localStorage.setItem('seatwise_role', targetRole);
      localStorage.setItem('seatwise_user', JSON.stringify(googleProfile));
      localStorage.setItem('seatwise_google_credential', credential);
      setAuthToken(`demo-token-${targetRole}`);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credential,
          });
        } catch (err) {
          // Non-blocking in demo/offline Supabase environments
        }
      }

      return googleProfile;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
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
    // Clear auth and reset to guest/student safely
    localStorage.removeItem('seatwise_user');
    localStorage.removeItem('seatwise_google_credential');
    localStorage.setItem('seatwise_role', 'student');
    setAuthToken('demo-token-student');
    setUser(ROLE_PROFILES.student);
    setCurrentRole('student');
  };

  const switchRole = (newRole: UserRole) => {
    const target = ROLE_PROFILES[newRole] || {
      id: `usr-${newRole}-01`,
      email: `${newRole}@jainuniversity.ac.in`,
      role: newRole,
      full_name: `${newRole.toUpperCase()} User`,
    };

    // Unconditionally update both role and user state
    setCurrentRole(newRole);
    setUser(target);
    localStorage.setItem('seatwise_role', newRole);
    localStorage.setItem('seatwise_user', JSON.stringify(target));
    setAuthToken(`demo-token-${newRole}`);
  };

  const activeRole = currentRole || user?.role || 'admin';
  const activeUser = user || ROLE_PROFILES[activeRole] || ROLE_PROFILES.admin;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        role: activeRole,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        switchRole,
        isAdmin: activeRole === 'admin',
        isFaculty: activeRole === 'faculty',
        isExamStaff: activeRole === 'exam_staff',
        isStudent: activeRole === 'student',
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
