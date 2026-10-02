import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share2, PlusSquare, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!showIOSGuide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowIOSGuide(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIOSGuide]);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5687F5] hover:bg-[#4374E0] active:scale-95 text-white text-xs font-semibold shadow-[0_2px_10px_rgba(86,135,245,0.4)] transition-all cursor-pointer"
        title="Instalar Finora en tu dispositivo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#262E3D] bg-[#171D2B] hover:bg-[#202738] active:scale-95 text-[#F5F7FC] text-xs font-medium transition-all cursor-pointer"
          title="Instalar en iPhone"
        >
          <Download className="w-3.5 h-3.5 text-[#5687F5]" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowIOSGuide(false);
              }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
            >
              <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0E131F] border border-[#1F293D] p-6 shadow-2xl relative text-left my-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#5687F5] flex items-center justify-center text-white text-lg font-bold shadow-[0_0_15px_rgba(86,135,245,0.4)] shrink-0">
                      F
                    </div>
                    <div>
                      <h3 id="ios-install-title" className="text-base font-bold text-white tracking-tight">
                        Instalar Finora en iPhone
                      </h3>
                      <p className="text-xs text-gray-400">Guía paso a paso para iOS Safari</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-[#161F33] transition-colors"
                    aria-label="Cerrar ventana"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Steps List */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#121826] border border-[#1F293D]">
                    <div className="w-8 h-8 rounded-xl bg-[#5687F5]/10 border border-[#5687F5]/30 flex items-center justify-center shrink-0 text-[#5687F5]">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <span className="font-semibold text-white block mb-0.5">Paso 1: Abrir Compartir</span>
                      Toca el botón <strong className="text-[#5687F5]">Compartir</strong> (ícono de un cuadrado con flecha hacia arriba) en la barra inferior de Safari.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#121826] border border-[#1F293D]">
                    <div className="w-8 h-8 rounded-xl bg-[#5687F5]/10 border border-[#5687F5]/30 flex items-center justify-center shrink-0 text-[#5687F5]">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <span className="font-semibold text-white block mb-0.5">Paso 2: Agregar a Inicio</span>
                      Desliza el menú hacia abajo y selecciona <strong className="text-white">«Agregar al inicio»</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#121826] border border-[#1F293D]">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <span className="font-semibold text-white block mb-0.5">Paso 3: Confirmar</span>
                      Toca <strong className="text-white">«Agregar»</strong> en la esquina superior derecha para instalar la app a pantalla completa y sin barras de navegador.
                    </div>
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-6 w-full py-3 rounded-xl bg-[#5687F5] hover:bg-[#4375E6] font-semibold text-sm text-white shadow-[0_0_20px_rgba(86,135,245,0.3)] transition-all cursor-pointer"
                >
                  Entendido, ya sé cómo hacerlo
                </button>
              </div>
            </div>,
            document.body
          )}
      </>
    );
  }

  return null;
};
