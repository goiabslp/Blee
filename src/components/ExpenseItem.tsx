import React from 'react';
import { motion } from 'motion/react';
import { Clock, CreditCard, Tag } from 'lucide-react';
import { Expense } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ExpenseItemProps {
  expense: Expense;
  onClick: (expense: Expense) => void;
  showShare?: boolean;
  memberId?: string;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  onClick,
  showShare = true,
  memberId,
}) => {
  const isInstallment = (expense.paymentMethod === 'parcelado' || expense.installmentNumber) && expense.installments && expense.installments > 1;
  const isFixed = expense.type === 'fixa';
  const isPaid = memberId === 'A' ? expense.statusA === 'paga' : memberId === 'B' ? expense.statusB === 'paga' : (expense.paymentMethod === 'vista' || expense.status === 'paga');
  const share = expense.amount / 2;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(expense)}
      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isFixed ? 'bg-blue-50 text-blue-500' : isInstallment ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-500'}`}>
          {isFixed ? <Clock size={16} /> : isInstallment ? <CreditCard size={16} /> : <Tag size={16} />}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900">{expense.description}</p>
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-medium text-slate-400">
              {isFixed ? `Mensal • Dia ${expense.recurringDay}` : isInstallment ? `Parcelado • ${expense.installmentNumber || 1}/${expense.installments}` : new Date(expense.date).toLocaleDateString('pt-BR')}
            </p>
            {isPaid && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">PAGA</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-black text-slate-900">{formatCurrency(expense.amount)}</p>
        {showShare && (
          <p className="text-[9px] font-bold text-emerald-600">Cota: {formatCurrency(share)}</p>
        )}
      </div>
    </motion.div>
  );
};
