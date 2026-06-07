import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

interface TimerState {
  activeInstanceId: number | null;
  activeRecordId: number | null;
  accumulatedElapsed: number;
  recordStartTime: number;
}

interface TimerContextValue extends TimerState {
  isActive: boolean;
  startSession: (instanceId: number, recordId: number, accumulated: number, startTime: number) => void;
  clearSession: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stateRef = useRef<TimerState>({
    activeInstanceId: null,
    activeRecordId: null,
    accumulatedElapsed: 0,
    recordStartTime: 0,
  });

  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const startSession = useCallback(
    (instanceId: number, recordId: number, accumulated: number, startTime: number) => {
      stateRef.current = {
        activeInstanceId: instanceId,
        activeRecordId: recordId,
        accumulatedElapsed: accumulated,
        recordStartTime: startTime,
      };
      bump();
    },
    [],
  );

  const clearSession = useCallback(() => {
    stateRef.current = {
      activeInstanceId: null,
      activeRecordId: null,
      accumulatedElapsed: 0,
      recordStartTime: 0,
    };
    bump();
  }, []);

  const value: TimerContextValue = {
    ...stateRef.current,
    isActive: stateRef.current.activeRecordId !== null,
    startSession,
    clearSession,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
