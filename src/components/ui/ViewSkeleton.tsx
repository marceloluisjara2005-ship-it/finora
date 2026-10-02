import React from 'react';

export const ViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 pb-20 animate-pulse" role="status" aria-label="Cargando contenido">
      {/* Header skeleton */}
      <div className="h-28 rounded-3xl bg-[#171D2B]/70 border border-[#262E3D]/50" />
      
      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-[#171D2B]/50 border border-[#262E3D]/40" />
        <div className="h-20 rounded-2xl bg-[#171D2B]/50 border border-[#262E3D]/40" />
      </div>

      {/* List items skeleton */}
      <div className="space-y-2.5 pt-2">
        <div className="h-16 rounded-2xl bg-[#171D2B]/40 border border-[#262E3D]/30" />
        <div className="h-16 rounded-2xl bg-[#171D2B]/40 border border-[#262E3D]/30" />
        <div className="h-16 rounded-2xl bg-[#171D2B]/40 border border-[#262E3D]/30" />
      </div>
      <span className="sr-only">Cargando módulo financiero...</span>
    </div>
  );
};
