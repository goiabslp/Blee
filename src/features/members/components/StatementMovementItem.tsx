import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface Movement {
  id: string;
  description: string;
  totalAmount: number;
  value: number;
  date: string;
  accBalance: number;
  payerName: string;
}

interface StatementMovementItemProps {
  move: Movement;
  isLast: boolean;
  formattedDate: string;
}

export const StatementMovementItem: React.FC<StatementMovementItemProps> = ({
  move,
  isLast,
  formattedDate,
}) => {
  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-6 top-10 bottom-0 w-[1px] bg-slate-100" />
      )}
      
      <div className="flex items-start gap-4 py-3">
        <div className={`z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-4 border-white shadow-sm ${move.value > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
          {move.value > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-0.5">
            <p className="truncate text-sm font-bold text-slate-900">{move.description}</p>
            <div className="text-right flex-shrink-0 ml-2">
              <p className={`text-sm font-black ${move.value > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {move.value > 0 ? '+' : ''}{formatCurrency(Math.abs(move.value))}
              </p>
              <p className="text-[10px] font-normal text-slate-500 leading-tight">
                Saldo: <span className={move.accBalance > 0 ? 'text-emerald-600' : move.accBalance < 0 ? 'text-rose-600' : 'text-slate-900'}>
                  {formatCurrency(Math.abs(move.accBalance))}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 mt-1">
            <p className="text-[10px] font-medium text-slate-500">
              <span className="font-bold">{move.payerName}</span> <span className="mx-1">|</span> {formattedDate}
            </p>
            <p className="text-[10px] font-medium text-slate-500">Total: <span className="font-bold">{formatCurrency(move.totalAmount)}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};
