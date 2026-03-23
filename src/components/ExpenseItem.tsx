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
  members?: import('../types').Member[];
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  parentExpense,
  onClick,
  showShare = true,
  memberRole,
  members,
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
      className="group relative overflow-hidden rounded-3xl border border-amber-100 bg-amber-50/20 p-5 shadow-sm transition-all hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-bold text-slate-900 leading-tight">{expense.description}</h4>
          
          <div className="flex items-center gap-2">
            {isPaid && (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[8px] font-black text-white uppercase tracking-widest shadow-sm">
                PAGO
              </span>
            )}
            {isInstallment && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-600 uppercase">
                Parcela {expense.installmentNumber || 1}/{expense.installments}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              expense.type === 'fixa' ? 'bg-blue-100 text-blue-600' :
              expense.type === 'assinaturas' ? 'bg-purple-100 text-purple-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              {expense.type === 'fixa' ? 'Fixa' : expense.type === 'assinaturas' ? 'Assinatura' : expense.type === 'eventual' ? 'Eventual' : 'Compras'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-1 shrink-0">
          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
            isInstallment ? 'text-indigo-600 bg-indigo-100' : 'text-emerald-600 bg-emerald-100'
          }`}>
            {isInstallment ? 'Sua Parcela' : 'Sua Cota'}
          </span>
          <p className={`text-base font-bold ${isInstallment ? 'text-indigo-700' : 'text-emerald-600'}`}>
            {formatCurrency(isInstallment ? memberInstallment : memberQuota)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
