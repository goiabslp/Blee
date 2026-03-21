import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon: Icon,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="pl-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={18} />
          </div>
        )}
        <input
          className={`
            w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pr-4 
            ${Icon ? 'pl-10' : 'pl-4'}
            text-slate-900 outline-none transition-all
            focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error ? (
        <p className="pl-1 text-[10px] font-bold text-rose-500">{error}</p>
      ) : helperText ? (
        <p className="pl-1 text-[10px] text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};
