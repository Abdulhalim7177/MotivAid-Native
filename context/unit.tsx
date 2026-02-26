import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
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
const ACTIVE_UNIT_CACHE_KEY = 'motivaid_active_unit_cache';

export const UnitProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [activeUnit, setActiveUnitState] = useState<Unit | null>(null);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      const savedId = await AsyncStorage.getItem(ACTIVE_UNIT_KEY);
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        // Offline: restore the full unit object cached from the last online session
        const cached = await AsyncStorage.getItem(ACTIVE_UNIT_CACHE_KEY);
        if (cached) {
          const unit = JSON.parse(cached) as Unit;
          setAvailableUnits([unit]);
          setActiveUnitState(unit);
        }
        return;
      }

      // Online: fetch from Supabase
      let query = supabase.from('units').select('id, name, facility_id, facilities(name)');

      // Admins and Supervisors can see ALL units in their facility
      if (['admin', 'supervisor'].includes(profile.role)) {
        if (profile.facility_id) {
          query = query.eq('facility_id', profile.facility_id);
        }
      }
      // Other staff (midwife, nurse, student) only see units they are members of
      else if (['midwife', 'nurse', 'student'].includes(profile.role)) {
        const { data: memberships } = await supabase
          .from('unit_memberships')
          .select('unit_id')
          .eq('profile_id', user.id)
          .eq('status', 'approved');

        const unitIds = memberships?.map(m => m.unit_id) || [];
        if (unitIds.length > 0) {
          query = query.in('id', unitIds);
        } else {
          // No memberships - don't show any units (will show AwaitingAssignment screen)
          // But staff can still access clinical mode from there
          setAvailableUnits([]);
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // @ts-ignore
      setAvailableUnits(data || []);

      if (data && data.length > 0) {
        const found = savedId ? data.find(u => u.id === savedId) : null;
        // @ts-ignore
        const unitToSet: Unit = found ?? data[0];
        setActiveUnitState(unitToSet);
        // Cache the full unit object so it can be restored when offline
        await AsyncStorage.setItem(ACTIVE_UNIT_CACHE_KEY, JSON.stringify(unitToSet));
      }
    } catch (error) {
      console.error('Error fetching units:', error);
      // On error, attempt to restore from cache so the app remains usable
      const cached = await AsyncStorage.getItem(ACTIVE_UNIT_CACHE_KEY);
      if (cached) {
        const unit = JSON.parse(cached) as Unit;
        setAvailableUnits([unit]);
        setActiveUnitState(unit);
      }
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
    await AsyncStorage.setItem(ACTIVE_UNIT_CACHE_KEY, JSON.stringify(unit));
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
