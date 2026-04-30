import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Receipt, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { Expense } from '../../../types';

interface NextPaymentsListProps {
  payments: any[];
  onSelectGroup: (group: any) => void;
  themeText: string;
  themeBorder: string;
  themeLightBg: string;
}

import { HorizontalScroll } from '../../../components/ui/HorizontalScroll';

export const NextPaymentsList: React.FC<NextPaymentsListProps> = ({
  payments,
  onSelectGroup,
  themeText,
  themeBorder,
  themeLightBg,
}) => {
  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center flex-1 flex flex-col items-center justify-center">
        <p className="text-[10px] text-slate-400 italic">Nenhum pagamento futuro projetado.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-3">
      {payments.map((group) => {
        const isToday = group.date.toDateString() === new Date().toDateString();
        const isNear = group.items.some((i: any) => i.isNear);
        
        const day = group.date.getDate();
        const month = group.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        
        return (
          <motion.div
            key={group.date.toISOString()}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -4 }}
            onClick={() => onSelectGroup(group)}
            className={`min-h-[140px] rounded-[2rem] border p-4 shadow-sm flex flex-col cursor-pointer transition-all duration-300 relative overflow-hidden group w-full ${
              isToday 
                ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-amber-100/50' 
                : isNear 
                ? `${themeBorder} ${themeLightBg} shadow-indigo-100/30` 
                : 'border-slate-100 bg-white hover:border-slate-200 shadow-slate-200/20'
            }`}
          >
            {/* Background Accent Decor */}
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-transform group-hover:scale-110 ${
              isToday ? 'bg-orange-500' : isNear ? 'bg-indigo-500' : 'bg-slate-500'
            }`} />

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex flex-col items-center justify-center rounded-2xl w-10 h-12 border shadow-sm shrink-0 ${
                  isToday ? 'bg-white border-orange-100' : isNear ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className="text-sm font-black leading-none text-red-500">
                    {day}
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-tighter mt-1 opacity-60 ${isToday ? 'text-orange-600' : isNear ? themeText : 'text-slate-500'}`}>
                    {month}
                  </span>
                </div>
                <div className="flex flex-col">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isToday ? 'HOJE' : 'Vencimento'}
                  </p>
                   {isNear && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertCircle size={10} className={isToday ? 'text-orange-500' : themeText} />
                      <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-orange-500' : themeText}`}>Urgente</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-3 flex flex-1 items-center">
              <div className={`flex items-center gap-2 rounded-2xl px-2.5 py-1 border backdrop-blur-sm transition-colors ${
                isToday ? 'bg-orange-100/50 border-orange-200/50' : isNear ? 'bg-indigo-100/50 border-indigo-200/50' : 'bg-slate-50 border-slate-100'
              }`}>
                <Receipt size={12} className={isToday ? 'text-orange-500' : isNear ? themeText : 'text-slate-400'} />
                <span className={`text-[10px] font-bold ${isToday ? 'text-orange-700' : isNear ? themeText : 'text-slate-600'}`}>
                  {group.items.length} {group.items.length === 1 ? 'despesa' : 'despesas'}
                </span>
              </div>
            </div>
  
            <div className="mt-auto pt-3 flex flex-col justify-end">
              <div className="flex items-end justify-between items-center bg-white/40 group-hover:bg-white/60 transition-colors p-2.5 rounded-xl -mx-1 mb-[-1px] border border-white/50">
                <div className="flex flex-col">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sua Cota</p>
                  <p className="text-xl font-black tracking-tight leading-none text-emerald-600">
                    {formatCurrency(group.total / 2)}
                  </p>
                </div>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0 ${
                  isToday ? 'bg-orange-500 text-white' : isNear ? 'bg-indigo-500 text-white' : 'bg-slate-900 text-white'
                }`}>
                  <CreditCard size={12} />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

