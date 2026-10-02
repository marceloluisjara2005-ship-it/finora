import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 inset-x-4 z-50 flex items-center justify-center gap-2 rounded-2xl bg-[#FBBF24]/95 backdrop-blur-md px-4 py-2 text-xs font-semibold text-[#080B12] shadow-xl border border-[#FBBF24]/40 animate-in slide-in-from-top duration-300">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Modo sin conexión — Tus movimientos se guardarán localmente y se sincronizarán al reconectar</span>
    </div>
  );
};
