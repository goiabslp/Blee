import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Receipt } from 'lucide-react';
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
    <HorizontalScroll className="flex-1 overflow-hidden" indicatorClassName="-mr-2">
      {payments.map((group) => {
        const isToday = group.date.toDateString() === new Date().toDateString();
        const isNear = group.items.some((i: any) => i.isNear);
        
        return (
          <motion.div
            key={group.date.toISOString()}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectGroup(group)}
            className={`min-w-[200px] flex-shrink-0 rounded-2xl border p-4 shadow-sm flex flex-col cursor-pointer transition-colors hover:bg-slate-50 ${
              isToday ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/50' : isNear ? `${themeBorder} ${themeLightBg}` : 'border-slate-100 bg-white'
            }`}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <span className={`text-sm font-black uppercase tracking-wider ${isToday ? 'text-amber-600' : isNear ? themeText : 'text-slate-800'}`}>
                  {isToday ? 'HOJE' : group.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
                <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Vencimento</p>
              </div>
              {isNear && <AlertCircle size={16} className={isToday ? 'text-amber-500' : themeText} />}
            </div>
            
            <div className="mb-4 flex-1 flex items-center">
              <div className="flex items-center gap-2 rounded-lg bg-slate-100/50 px-3 py-2">
                <Receipt size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">
                  {group.items.length} {group.items.length === 1 ? 'despesa' : 'despesas'}
                </span>
              </div>
            </div>

            <div className="mt-auto border-t border-slate-200/60 pt-3">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Sua Cota</p>
              <p className={`text-xl font-black ${isToday ? 'text-amber-700' : isNear ? themeText : 'text-slate-900'}`}>
                {formatCurrency(group.total / 2)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </HorizontalScroll>
  );
};
