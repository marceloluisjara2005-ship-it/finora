import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle, Trash2 } from 'lucide-react';
import type { AppNotification } from '../../types/finance';
import { formatDateTime } from '../../lib/dates';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl bg-[#101522] border border-[#262E3D] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#262E3D] flex items-center justify-between bg-[#171D2B]">
          <div className="flex items-center gap-2">
            <h3 id="notif-modal-title" className="text-base font-semibold text-[#F5F7FC]">
              Centro de Notificaciones
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#5687F5]/20 text-[#5687F5] font-medium">
              {notifications.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                aria-label="Limpiar todas las notificaciones"
                className="text-[#929BAD] hover:text-[#FB7185] p-1.5 transition-colors"
                title="Limpiar todas"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar modal de notificaciones"
              className="p-1.5 rounded-full text-[#929BAD] hover:text-[#F5F7FC] hover:bg-[#262E3D]/50 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-[#929BAD]">
              <Info className="w-10 h-10 mx-auto mb-2 text-[#929BAD]/50" />
              <p className="text-sm font-medium">No tienes alertas pendientes</p>
              <p className="text-xs mt-1 text-[#929BAD]/80">Te avisaremos sobre tus presupuestos y vencimientos.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isWarning = notif.type === 'warning';
              const isError = notif.type === 'error';
              const isSuccess = notif.type === 'success';

              return (
                <div
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    notif.read
                      ? 'bg-[#171D2B]/50 border-[#262E3D]/50 text-[#929BAD]'
                      : 'bg-[#171D2B] border-[#262E3D] shadow-md text-[#F5F7FC]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />}
                      {isWarning && <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />}
                      {isError && <AlertCircle className="w-4 h-4 text-[#F87171]" />}
                      {!isSuccess && !isWarning && !isError && <Info className="w-4 h-4 text-[#5687F5]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold">{notif.title}</h4>
                        <span className="text-[10px] text-[#929BAD]">{formatDateTime(notif.createdAt)}</span>
                      </div>
                      <p className="text-xs text-[#929BAD] mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
