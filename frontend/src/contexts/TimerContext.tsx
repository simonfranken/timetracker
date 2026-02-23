import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timerApi } from "@/api/timer";
import type { OngoingTimer, TimeEntry } from "@/types";

interface TimerContextType {
  ongoingTimer: OngoingTimer | null;
  isLoading: boolean;
  elapsedSeconds: number;
  startTimer: (projectId?: string) => Promise<void>;
  updateTimerProject: (projectId?: string | null) => Promise<void>;
  updateTimerStartTime: (startTime: string) => Promise<void>;
  stopTimer: (projectId?: string) => Promise<TimeEntry | null>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Use ref for interval ID to avoid stale closure issues
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: ongoingTimer, isLoading } = useQuery({
    queryKey: ["ongoingTimer"],
    queryFn: timerApi.getOngoing,
    refetchInterval: 60000, // Refetch every minute to sync with server
  });

  // Calculate elapsed time
  useEffect(() => {
    if (ongoingTimer) {
      const startTime = new Date(ongoingTimer.startTime).getTime();
      const now = Date.now();
      const initialElapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(initialElapsed);

      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start interval to update elapsed time
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount or when ongoingTimer changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [ongoingTimer]);

  // Start timer mutation
  const startMutation = useMutation({
    mutationFn: timerApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ongoingTimer"] });
    },
  });

  // Update timer mutation
  const updateMutation = useMutation({
    mutationFn: timerApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ongoingTimer"] });
    },
  });

  // Stop timer mutation
  const stopMutation = useMutation({
    mutationFn: timerApi.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ongoingTimer"] });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    },
  });

  const startTimer = useCallback(
    async (projectId?: string) => {
      await startMutation.mutateAsync(projectId);
    },
    [startMutation],
  );

  const updateTimerProject = useCallback(
    async (projectId?: string | null) => {
      await updateMutation.mutateAsync({ projectId });
    },
    [updateMutation],
  );

  const updateTimerStartTime = useCallback(
    async (startTime: string) => {
      await updateMutation.mutateAsync({ startTime });
    },
    [updateMutation],
  );

  const stopTimer = useCallback(
    async (projectId?: string): Promise<TimeEntry | null> => {
      try {
        const entry = await stopMutation.mutateAsync(projectId);
        return entry;
      } catch {
        return null;
      }
    },
    [stopMutation],
  );

  return (
    <TimerContext.Provider
      value={{
        ongoingTimer: ongoingTimer ?? null,
        isLoading,
        elapsedSeconds,
        startTimer,
        updateTimerProject,
        updateTimerStartTime,
        stopTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
