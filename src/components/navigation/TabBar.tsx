import React from 'react';
import { Home, ArrowLeftRight, Plus, PieChart, SlidersHorizontal, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export type NavTab = 'dashboard' | 'transactions' | 'stats' | 'budgets' | 'profile';

interface TabBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickAdd: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickAdd,
}) => {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-2">
        <nav
          role="tablist"
          aria-label="Barra de navegación principal"
          className="pointer-events-auto h-16 rounded-3xl bg-[#101522]/90 backdrop-blur-xl border border-[#262E3D]/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-around px-2 relative"
        >
          {/* Tab 1: Inicio */}
          <button
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            aria-label="Pestaña Inicio"
            onClick={() => onSelectTab('dashboard')}
            className={cn(
              'flex flex-col items-center justify-center w-14 h-full transition-all duration-200 select-none focus:outline-none',
              activeTab === 'dashboard'
                ? 'text-[#5687F5] scale-105'
                : 'text-[#929BAD] hover:text-[#F5F7FC]'
            )}
          >
            <Home className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.75} aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-tight">Inicio</span>
          </button>

          {/* Tab 2: Movimientos */}
          <button
            role="tab"
            aria-selected={activeTab === 'transactions'}
            aria-label="Pestaña Movimientos"
            onClick={() => onSelectTab('transactions')}
            className={cn(
              'flex flex-col items-center justify-center w-14 h-full transition-all duration-200 select-none focus:outline-none',
              activeTab === 'transactions'
                ? 'text-[#5687F5] scale-105'
                : 'text-[#929BAD] hover:text-[#F5F7FC]'
            )}
          >
            <ArrowLeftRight className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'transactions' ? 2.5 : 1.75} aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-tight">Movimientos</span>
          </button>

          {/* Central Quick Add Action Button */}
          <div className="relative -top-5 flex items-center justify-center">
            <button
              onClick={onOpenQuickAdd}
              aria-label="Registrar nuevo movimiento"
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#5687F5] text-white shadow-[0_4px_20px_rgba(86,135,245,0.5)] active:scale-90 hover:brightness-110 flex items-center justify-center border-4 border-[#080B12] transition-transform focus:outline-none"
            >
              <Plus className="w-6 h-6 stroke-[2.75]" aria-hidden="true" />
            </button>
          </div>

          {/* Tab 3: Estadísticas */}
          <button
            role="tab"
            aria-selected={activeTab === 'stats'}
            aria-label="Pestaña Estadísticas"
            onClick={() => onSelectTab('stats')}
            className={cn(
              'flex flex-col items-center justify-center w-14 h-full transition-all duration-200 select-none focus:outline-none',
              activeTab === 'stats'
                ? 'text-[#5687F5] scale-105'
                : 'text-[#929BAD] hover:text-[#F5F7FC]'
            )}
          >
            <PieChart className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'stats' ? 2.5 : 1.75} aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-tight">Estadísticas</span>
          </button>

          {/* Tab 4: Presupuestos */}
          <button
            role="tab"
            aria-selected={activeTab === 'budgets'}
            aria-label="Pestaña Límites y Cuotas"
            onClick={() => onSelectTab('budgets')}
            className={cn(
              'flex flex-col items-center justify-center w-14 h-full transition-all duration-200 select-none focus:outline-none',
              activeTab === 'budgets'
                ? 'text-[#5687F5] scale-105'
                : 'text-[#929BAD] hover:text-[#F5F7FC]'
            )}
          >
            <SlidersHorizontal className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'budgets' ? 2.5 : 1.75} aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-tight">Límites</span>
          </button>

          {/* Tab 5: Perfil */}
          <button
            role="tab"
            aria-selected={activeTab === 'profile'}
            aria-label="Pestaña Perfil"
            onClick={() => onSelectTab('profile')}
            className={cn(
              'flex flex-col items-center justify-center w-14 h-full transition-all duration-200 select-none focus:outline-none',
              activeTab === 'profile'
                ? 'text-[#5687F5] scale-105'
                : 'text-[#929BAD] hover:text-[#F5F7FC]'
            )}
          >
            <User className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'profile' ? 2.5 : 1.75} aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-tight">Perfil</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
