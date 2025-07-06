import { useState, useEffect } from 'react';

export function usePhaseTimer(roomCode: string, phase: string, phaseStartTime: string, defaultDuration: number) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(defaultDuration);

  useEffect(() => {
    let ignore = false;
    const fetchDuration = async () => {
      try {
        const response = await fetch(`/api/phase-settings?phase=${phase}`);
        const data = await response.json();
        if (!ignore && data.duration && typeof data.duration === 'number') {
          setDuration(data.duration);
        }
      } catch (error) {
        // fallback: do nothing, use defaultDuration
      }
    };
    fetchDuration();
    return () => { ignore = true; };
  }, [roomCode, phase, defaultDuration]);

  useEffect(() => {
    if (!phaseStartTime || !duration) return;
    const startTime = new Date(phaseStartTime).getTime();
    const durationMs = duration * 1000;
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
      setTimeRemaining(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [phaseStartTime, duration]);

  const getTimerColor = () => {
    if (!timeRemaining || !duration) return 'text-green-500';
    const percentage = (timeRemaining / duration) * 100;
    if (percentage > 50) return 'text-green-500';
    if (percentage > 25) return 'text-yellow-500';
    return 'text-red-500';
  };

  return {
    timeRemaining,
    duration,
    timerColor: getTimerColor()
  };
} 