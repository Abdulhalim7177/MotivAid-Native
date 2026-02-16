import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { cacheProfile, getCachedProfile, initDatabase, clearProfileCache, getLatestCachedUser } from '../lib/db';
import NetInfo from '@react-native-community/netinfo';
import { saveOfflineCredentials, verifyOfflineCredentials, authenticateBiometric } from '../lib/security';

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  website: string | null;
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
  refreshProfile: async () => {},
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  signInBiometric: async () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineAuthenticated, setIsOfflineAuthenticated] = useState(false);

  const fetchProfile = async (userId: string, freshUserObj: any = null) => {
    try {
      const cached = await getCachedProfile(userId);
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
    } catch (error) {}
  };

  useEffect(() => {
    initDatabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser);
        setIsOfflineAuthenticated(true);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
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
  }, []);

  const signIn = async (email: string, password: string) => {
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        await saveOfflineCredentials(email, password);
        await fetchProfile(data.user.id, data.user);
        setIsOfflineAuthenticated(true);
      }
      return { error };
    } else {
      const isValid = await verifyOfflineCredentials(email, password);
      if (isValid) {
        const cached = await getLatestCachedUser();
        if (cached) {
          setUser(cached.user);
          setProfile(cached.profile);
        }
        setIsOfflineAuthenticated(true);
        return { error: null };
      } else {
        return { error: { message: 'Invalid credentials for offline login' } };
      }
    }
  };

  const signInBiometric = async () => {
    const success = await authenticateBiometric();
    if (success) {
      const cached = await getLatestCachedUser();
      if (cached) {
        setUser(cached.user);
        setProfile(cached.profile);
        setIsOfflineAuthenticated(true);
        return true;
      }
    }
    return false;
  };

  const signOut = async () => {
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      await supabase.auth.signOut();
    }
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
