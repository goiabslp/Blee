import React from 'react';
import { Heart } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
          <Heart size={18} fill="currentColor" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">CoupleSplit</h1>
      </div>
      <div className="text-xs font-medium text-slate-400">
        Divisão de Despesas
      </div>
    </header>
  );
};
