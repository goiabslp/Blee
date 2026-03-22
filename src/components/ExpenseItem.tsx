import React from 'react';
import { motion } from 'motion/react';
import { Clock, CreditCard, Tag } from 'lucide-react';
import { Expense } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ExpenseItemProps {
  expense: Expense;
  parentExpense?: Expense;
  onClick: (expense: Expense) => void;
  showShare?: boolean;
  memberRole?: 'A' | 'B';
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  parentExpense,
  onClick,
  showShare = true,
  memberRole,
}) => {
  const isInstallment = (expense.paymentMethod === 'parcelado' || expense.installmentNumber) && expense.installments && expense.installments > 1;
  const isFixed = expense.type === 'fixa';
  const isPaid = memberRole === 'A' ? expense.statusA === 'paga' : memberRole === 'B' ? expense.statusB === 'paga' : (expense.paymentMethod === 'vista' || expense.status === 'paga');
  
  const totalAmount = parentExpense ? parentExpense.amount : expense.amount;
  const memberQuota = totalAmount / 2;
  const memberInstallment = isInstallment ? (totalAmount / (expense.installments || 1)) / 2 : 0;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(expense)}
      className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Descrição e Ícone */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isFixed ? 'bg-blue-50 text-blue-500' : isInstallment ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-500'}`}>
            {isFixed ? <Clock size={20} /> : isInstallment ? <CreditCard size={20} /> : <Tag size={20} />}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900 truncate leading-tight">{expense.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-medium text-slate-400">
                {isFixed ? `Mensal • Dia ${expense.recurringDay}` : isInstallment ? `Parcelado • ${expense.installmentNumber || 1}/${expense.installments}` : new Date(expense.date).toLocaleDateString('pt-BR')}
              </span>
              {isPaid && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] border border-emerald-200 font-bold text-emerald-700 uppercase tracking-widest">PAGO</span>
              )}
            </div>
          </div>
        </div>

        {/* Valores Horizontais */}
        <div className="flex items-center gap-0 text-right whitespace-nowrap">
           <div className="flex flex-col items-end px-2">
             <span className="text-[10px] font-medium uppercase text-slate-400">Valor Total</span>
             <span className="text-base font-medium text-slate-900">{formatCurrency(totalAmount)}</span>
           </div>
           
           <span className="text-slate-200 text-xl font-thin">/</span>

           <div className="flex flex-col items-end px-2">
             <span className="text-[10px] font-medium uppercase text-emerald-500">Cota do Membro</span>
             <span className="text-base font-medium text-emerald-600">{formatCurrency(memberQuota)}</span>
           </div>

           {isInstallment && (
             <>
               <span className="text-slate-200 text-xl font-thin">/</span>
               <div className="flex flex-col items-end px-2 text-indigo-600">
                 <span className="text-[10px] font-medium uppercase text-indigo-500">Valor da Parcela</span>
                 <span className="text-base font-medium">{formatCurrency(memberInstallment)}</span>
               </div>
             </>
           )}
        </div>
      </div>
    </motion.div>
  );
};
