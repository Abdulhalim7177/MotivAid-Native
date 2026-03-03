import NetInfo from '@react-native-community/netinfo';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { cacheProfile, getCachedProfile, getLatestCachedUser, initDatabase } from '../lib/db';
import { authenticateBiometric, saveOfflineCredentials, verifyOfflineCredentials } from '../lib/security';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  website: string | null;
  facility_id?: string | null;
  role: 'admin' | 'user' | 'supervisor' | 'midwife' | 'student' | 'nurse';
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isOfflineAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInBiometric: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isOfflineAuthenticated: false,
  refreshProfile: async () => { },
  signIn: async () => ({ error: null }),
  signOut: async () => { },
  signInBiometric: async () => false,
});

/** Build a minimal User-like object from cached profile when user_data was not stored */
const buildUserFromProfile = (profile: Profile): any => ({
  id: profile.id,
  email: '',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '',
});

/** Resolve cached user data, ensuring user is never null when profile exists */
const resolveCachedUser = (cached: { user: any; profile: any } | null) => {
  if (!cached) return null;
  const resolvedUser = cached.user ?? (cached.profile ? buildUserFromProfile(cached.profile) : null);
  return resolvedUser ? { user: resolvedUser, profile: cached.profile } : null;
};

const SESSION_TIMEOUT_MS = 5000; // 5 second timeout for getSession

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineAuthenticated, setIsOfflineAuthenticated] = useState(false);

  const fetchProfile = async (userId: string, freshUserObj: any = null) => {
    try {
      const cached = await getCachedProfile(userId) as { profile: any; user: any } | null;
      if (cached) {
        setProfile(cached.profile);
        if (!user && cached.user) setUser(cached.user);
      }

      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId);

        if (error) throw error;

        if (data && data.length > 0) {
          const freshProfile = data[0];
          setProfile(freshProfile);
          await cacheProfile(userId, freshProfile, freshUserObj || user);
        }
      }
    } catch (error) {
      console.warn('[Auth] fetchProfile error (non-fatal):', error);
    }
  };

  /** Try to load cached user from SQLite as a fallback for offline startup */
  const fallbackToCache = async () => {
    try {
      const resolved = resolveCachedUser(await getLatestCachedUser());
      if (resolved) {
        setUser(resolved.user);
        setProfile(resolved.profile);
        setIsOfflineAuthenticated(true);
      }
    } catch (e) {
      console.warn('[Auth] Cache fallback failed:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      // IMPORTANT: await DB init so cache is available as fallback
      await initDatabase();

      try {
        // Race getSession against a timeout so the app doesn't hang offline
        const { data: { session: sess } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('getSession timeout')), SESSION_TIMEOUT_MS)
          ),
        ]);

        setSession(sess);
        const currentUser = sess?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          // Force-cache user data immediately on startup
          await cacheProfile(currentUser.id, { id: currentUser.id, role: 'user' }, currentUser);
          fetchProfile(currentUser.id, currentUser);
          setIsOfflineAuthenticated(true);
        } else {
          // No online session — try loading from cache (previous offline login)
          await fallbackToCache();
        }
      } catch {
        // Timeout or network error — fall back to cached user
        await fallbackToCache();
      }

      setIsLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        // Force-cache on auth state change too
        cacheProfile(currentUser.id, { id: currentUser.id, role: 'user' }, currentUser);
        fetchProfile(currentUser.id, currentUser);
        setIsOfflineAuthenticated(true);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const netState = await NetInfo.fetch();

    if (netState.isConnected) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        await saveOfflineCredentials(email, password);
        // CRITICAL: Force-cache user data BEFORE fetchProfile so offline always has data
        await cacheProfile(data.user.id, { id: data.user.id, role: 'user' }, data.user);
        await fetchProfile(data.user.id, data.user);
        setIsOfflineAuthenticated(true);
      }
      return { error };
    } else {
      // Offline login
      const isValid = await verifyOfflineCredentials(email, password);
      if (isValid) {
        const resolved = resolveCachedUser(await getLatestCachedUser());
        if (resolved) {
          setUser(resolved.user);
          setProfile(resolved.profile);
          setIsOfflineAuthenticated(true);
          return { error: null };
        } else {
          return { error: { message: 'No cached profile found. Please login online first.' } };
        }
      } else {
        return { error: { message: 'Invalid credentials for offline login' } };
      }
    }
  };

  const signInBiometric = async () => {
    try {
      const success = await authenticateBiometric();
      if (success) {
        const resolved = resolveCachedUser(await getLatestCachedUser());
        if (resolved) {
          setUser(resolved.user);
          setProfile(resolved.profile);
          setIsOfflineAuthenticated(true);
          return true;
        }
        // Biometric succeeded but no cached user — can't proceed
        console.warn('[Auth] Biometric OK but no cached user data');
      }
    } catch (e) {
      console.warn('[Auth] Biometric error:', e);
    }
    return false;
  };

  const signOut = async () => {
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsOfflineAuthenticated(false);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      isLoading,
      isOfflineAuthenticated,
      refreshProfile,
      signIn,
      signOut,
      signInBiometric
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
