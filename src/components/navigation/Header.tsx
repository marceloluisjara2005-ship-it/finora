import React from 'react';
import { Eye, EyeOff, Bell, Calendar } from 'lucide-react';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { formatMonthLabel, getPreviousMonth, getNextMonth } from '../../lib/dates';

interface HeaderProps {
  currentPeriod: string;
  onChangePeriod: (period: string) => void;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPeriod,
  onChangePeriod,
  privacyMode,
  onTogglePrivacy,
  unreadCount,
  onOpenNotifications,
}) => {
  return (
    <header className="sticky top-0 z-30 pt-safe bg-[#080B12]/80 backdrop-blur-xl border-b border-[#262E3D]/50 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Brand & Period */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5687F5] to-[#3B82F6] flex items-center justify-center text-white font-bold text-sm shadow-[0_2px_10px_rgba(86,135,245,0.4)]">
            F
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#F5F7FC] tracking-tight">Finora</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#171D2B] text-[#5687F5] border border-[#262E3D] font-medium">Contador</span>
            </div>
            
            {/* Quick Period Pill */}
            <div className="flex items-center gap-1 text-[11px] text-[#929BAD] mt-0.5">
              <Calendar className="w-3 h-3 text-[#5687F5]" />
              <button
                onClick={() => onChangePeriod(getPreviousMonth(currentPeriod))}
                className="hover:text-[#F5F7FC] px-0.5"
                title="Mes anterior"
              >
                ‹
              </button>
              <span className="font-medium text-[#F5F7FC]">{formatMonthLabel(currentPeriod)}</span>
              <button
                onClick={() => onChangePeriod(getNextMonth(currentPeriod))}
                className="hover:text-[#F5F7FC] px-0.5"
                title="Mes siguiente"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Right Actions: Privacy, Install, Notifications */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          {/* Privacy Toggle */}
          <button
            onClick={onTogglePrivacy}
            aria-label={privacyMode ? 'Mostrar importes' : 'Ocultar importes'}
            className="w-9 h-9 rounded-2xl bg-[#171D2B] hover:bg-[#202738] active:scale-95 border border-[#262E3D] flex items-center justify-center text-[#929BAD] hover:text-[#F5F7FC] transition-all"
            title={privacyMode ? 'Mostrar importes' : 'Modo privacidad (ocultar montos)'}
          >
            {privacyMode ? <EyeOff className="w-4 h-4 text-[#FBBF24]" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Notifications Drawer Toggle */}
          <button
            onClick={onOpenNotifications}
            aria-label="Notificaciones"
            className="relative w-9 h-9 rounded-2xl bg-[#171D2B] hover:bg-[#202738] active:scale-95 border border-[#262E3D] flex items-center justify-center text-[#929BAD] hover:text-[#F5F7FC] transition-all"
            title="Centro de alertas"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FB7185] text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#080B12] animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
