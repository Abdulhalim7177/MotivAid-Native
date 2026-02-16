import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

type Unit = {
  id: string;
  name: string;
  facility_id: string;
  facilities: { name: string };
};

type UnitContextType = {
  activeUnit: Unit | null;
  availableUnits: Unit[];
  isLoading: boolean;
  setActiveUnit: (unit: Unit) => void;
  refreshUnits: () => Promise<void>;
};

const UnitContext = createContext<UnitContextType | undefined>(undefined);
const ACTIVE_UNIT_KEY = 'motivaid_active_unit_id';

export const UnitProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [activeUnit, setActiveUnitState] = useState<Unit | null>(null);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = async () => {
    if (!user || !profile) return;
    
    setIsLoading(true);
    try {
      let query = supabase.from('units').select('id, name, facility_id, facilities(name)');

      // If user is staff, only get units they are members of
      if (['midwife', 'nurse', 'student', 'supervisor'].includes(profile.role)) {
        const { data: memberships } = await supabase
          .from('unit_memberships')
          .select('unit_id')
          .eq('profile_id', user.id)
          .eq('status', 'approved');
        
        const unitIds = memberships?.map(m => m.unit_id) || [];
        if (unitIds.length > 0) {
          query = query.in('id', unitIds);
        } else {
          setAvailableUnits([]);
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // @ts-ignore
      setAvailableUnits(data || []);

      // Restore active unit from storage
      const savedId = await AsyncStorage.getItem(ACTIVE_UNIT_KEY);
      if (savedId && data) {
        const found = data.find(u => u.id === savedId);
        // @ts-ignore
        if (found) setActiveUnitState(found);
        // @ts-ignore
        else if (data.length > 0) setActiveUnitState(data[0]);
      } 
      // @ts-ignore
      else if (data && data.length > 0) {
        // @ts-ignore
        setActiveUnitState(data[0]);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [user, profile]);

  const setActiveUnit = async (unit: Unit) => {
    setActiveUnitState(unit);
    await AsyncStorage.setItem(ACTIVE_UNIT_KEY, unit.id);
  };

  return (
    <UnitContext.Provider value={{ 
      activeUnit, 
      availableUnits, 
      isLoading, 
      setActiveUnit, 
      refreshUnits: fetchUnits 
    }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnits = () => {
  const context = useContext(UnitContext);
  if (!context) throw new Error('useUnits must be used within a UnitProvider');
  return context;
};
