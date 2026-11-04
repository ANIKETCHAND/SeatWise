/**
 * Seating Planner Global State Context.
 * 
 * Manages active seating plan generation parameters, selected rooms,
 * active exam context, solver policies, and seating matrix state.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { SeatingPolicy } from '../types';

export interface DeskCellState {
  seat_label: string;
  row: number;
  col: number;
  is_blocked?: boolean;
  is_locked?: boolean;
  student_id?: string;
  roll_number?: string;
  student_name?: string;
  batch?: string;
  attendance?: 'present' | 'absent';
}

export interface RoomGridState {
  roomId: string;
  roomName: string;
  rows: number;
  cols: number;
  cells: DeskCellState[];
}

export const DEFAULT_POLICY: SeatingPolicy = {
  block_same_batch_horizontal: true,
  block_same_batch_vertical: true,
  block_same_batch_diagonal: false,
  allow_empty_seats: true,
  allow_mixed_batches: true,
  separate_programs: true,
};

interface SeatingContextValue {
  selectedExamId: string;
  setSelectedExamId: (id: string) => void;
  selectedHalls: string[];
  setSelectedHalls: (halls: string[]) => void;
  activeHall: string;
  setActiveHall: (hall: string) => void;
  savedPlanId: string | null;
  setSavedPlanId: (id: string | null) => void;
  policy: SeatingPolicy;
  setPolicy: React.Dispatch<React.SetStateAction<SeatingPolicy>>;
  updatePolicyFlag: (key: keyof SeatingPolicy, val: boolean) => void;
  resetPolicy: () => void;
  selectedSeatForMove: { hall: string; seatLabel: string } | null;
  setSelectedSeatForMove: (seat: { hall: string; seatLabel: string } | null) => void;
}

const SeatingContext = createContext<SeatingContextValue | undefined>(undefined);

export const SeatingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('EXAM-2026-1101');
  const [selectedHalls, setSelectedHalls] = useState<string[]>(['A-101', 'A-102', 'A-313']);
  const [activeHall, setActiveHall] = useState<string>('A-101');
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<SeatingPolicy>(DEFAULT_POLICY);
  const [selectedSeatForMove, setSelectedSeatForMove] = useState<{ hall: string; seatLabel: string } | null>(null);

  const updatePolicyFlag = useCallback((key: keyof SeatingPolicy, val: boolean) => {
    setPolicy((prev) => ({ ...prev, [key]: val }));
  }, []);

  const resetPolicy = useCallback(() => {
    setPolicy(DEFAULT_POLICY);
  }, []);

  return (
    <SeatingContext.Provider
      value={{
        selectedExamId,
        setSelectedExamId,
        selectedHalls,
        setSelectedHalls,
        activeHall,
        setActiveHall,
        savedPlanId,
        setSavedPlanId,
        policy,
        setPolicy,
        updatePolicyFlag,
        resetPolicy,
        selectedSeatForMove,
        setSelectedSeatForMove,
      }}
    >
      {children}
    </SeatingContext.Provider>
  );
};

export const useSeatingState = () => {
  const ctx = useContext(SeatingContext);
  if (!ctx) {
    throw new Error('useSeatingState must be used within a SeatingProvider');
  }
  return ctx;
};
