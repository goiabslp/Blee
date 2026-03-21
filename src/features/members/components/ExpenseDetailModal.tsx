import React from 'react';
import { Calendar, CreditCard, Info, Receipt, Tag } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Expense } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onUpdateExpense?: (expense: Expense) => void;
  themeBg: string;
  themeShadow: string;
  memberId?: string;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  onUpdateExpense,
  themeBg,
  themeShadow,
  memberId,
}) => {
  if (!expense) return null;

  const isPaid = memberId === 'A' ? expense.statusA === 'paga' : memberId === 'B' ? expense.statusB === 'paga' : (expense.paymentMethod === 'vista' || expense.status === 'paga');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Despesa" position="bottom">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${themeBg} text-white shadow-lg ${themeShadow}`}>
            <Receipt size={28} />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{expense.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase">
                {expense.type || 'Compra'}
              </span>
              {isPaid && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase">
                  PAGA
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor Total</p>
            <p className="text-lg font-black text-slate-900">{formatCurrency(expense.amount)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sua Cota (50%)</p>
            <p className="text-lg font-black text-emerald-700">{formatCurrency(expense.amount / 2)}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar size={14} />
              <span>Data</span>
            </div>
            <span className="font-bold text-slate-900">{formatDate(expense.date)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <CreditCard size={14} />
              <span>Pagamento</span>
            </div>
            <span className="font-bold text-slate-900 uppercase">
              {expense.paymentMethod === 'parcelado' ? 'Parcelado' : 'À Vista'}
            </span>
          </div>

          {expense.installments && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Info size={14} />
                <span>Parcelas</span>
              </div>
              <span className="font-bold text-indigo-600">
                {expense.installmentNumber || 1} de {expense.installments}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Tag size={14} />
              <span>Método</span>
            </div>
            <span className="font-bold text-slate-900 uppercase">
              {expense.paymentType === 'dinheiro' ? 'Dinheiro' : 'Cartão'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          {!isPaid && onUpdateExpense && (
            <Button
              onClick={() => {
                const updatedExpense = { ...expense };
                if (memberId === 'A') updatedExpense.statusA = 'paga';
                else if (memberId === 'B') updatedExpense.statusB = 'paga';
                else updatedExpense.status = 'paga';
                
                onUpdateExpense(updatedExpense);
                onClose();
              }}
              variant="success"
              className="flex-1"
            >
              Pagar Minha Cota
            </Button>
          )}
          <Button onClick={onClose} className={`flex-1 ${themeBg} ${themeShadow}`}>
            Fechar Detalhes
          </Button>
        </div>
      </div>
    </Modal>
  );
};
