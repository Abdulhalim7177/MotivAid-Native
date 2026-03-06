import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppMode = 'clinical' | 'simulation';

type ModeContextType = {
  mode: AppMode;
  isSimulation: boolean;
  setMode: (mode: AppMode) => void;
};

const STORAGE_KEY = 'motivaid_app_mode';

const ModeContext = createContext<ModeContextType>({
  mode: 'clinical',
  isSimulation: false,
  setMode: () => {},
});

export const ModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<AppMode>('clinical');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'simulation') {
        setModeState('simulation');
      }
    });
  }, []);

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  return (
    <ModeContext.Provider value={{ mode, isSimulation: mode === 'simulation', setMode }}>
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};
