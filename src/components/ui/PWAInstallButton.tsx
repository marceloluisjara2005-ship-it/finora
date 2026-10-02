import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5687F5] hover:bg-[#4374E0] active:scale-95 text-white text-xs font-medium shadow-md transition-all"
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#262E3D] bg-[#171D2B] hover:bg-[#202738] active:scale-95 text-[#F5F7FC] text-xs font-medium transition-all"
          title="Instalar en iPhone"
        >
          <Download className="w-3.5 h-3.5 text-[#5687F5]" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-[#171D2B] border border-[#262E3D] p-6 shadow-2xl text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#5687F5]/20 flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-[#5687F5]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#F5F7FC]">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-[#929BAD] hover:text-[#F5F7FC]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm text-[#929BAD]">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#101522] border border-[#262E3D]/60">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5687F5]/20 text-[#5687F5] text-xs font-bold flex items-center justify-center">1</span>
                  <p>Toca el botón <strong className="text-[#F5F7FC]">Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra inferior de Safari.</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#101522] border border-[#262E3D]/60">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5687F5]/20 text-[#5687F5] text-xs font-bold flex items-center justify-center">2</span>
                  <p>Desplaza hacia abajo y selecciona <strong className="text-[#F5F7FC]">«Agregar al inicio»</strong>.</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#101522] border border-[#262E3D]/60">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5687F5]/20 text-[#5687F5] text-xs font-bold flex items-center justify-center">3</span>
                  <p>Toca <strong className="text-[#F5F7FC]">«Agregar»</strong> para disfrutar de la experiencia nativa a pantalla completa.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-3 rounded-2xl bg-[#5687F5] hover:bg-[#4374E0] font-medium text-sm text-white transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
