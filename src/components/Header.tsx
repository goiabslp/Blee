import React from 'react';
import { Heart, Settings, LogOut } from 'lucide-react';
import { Button } from './ui/Button';

interface HeaderProps {
  onOpenSettings: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onSignOut }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
          <Heart size={20} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">Blee</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mt-0.5">Finance</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="hidden sm:block mr-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
          <p className="text-[11px] font-bold text-emerald-500">Sincronizado</p>
        </div>
        
        <div className="flex gap-1.5 border-l border-slate-100 pl-3 ml-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onOpenSettings} 
            className="h-9 w-9 bg-slate-50 text-slate-500 hover:bg-slate-100"
          >
            <Settings size={18} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSignOut} 
            className="h-9 w-9 bg-slate-50 text-rose-500 hover:bg-rose-50"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
};
