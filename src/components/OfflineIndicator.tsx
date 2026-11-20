import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg border border-amber-500/50"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Sin conexión — Usando datos guardados</span>
    </div>
  );
};
