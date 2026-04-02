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
  parentExpense?: Expense;
  onUpdateExpense?: (expense: Expense) => void;
  themeBg: string;
  themeShadow: string;
  memberRole?: 'A' | 'B';
  members?: import('../../../types').Member[];
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  parentExpense,
  onUpdateExpense,
  themeBg,
  themeShadow,
  memberRole,
  members,
}) => {
  if (!expense) return null;

  const isInstallment = (expense.paymentMethod === 'parcelado' || expense.installmentNumber) && expense.installments && (expense.installments > 1);
  const isPaid = memberRole === 'A' ? expense.statusA === 'paga' : memberRole === 'B' ? expense.statusB === 'paga' : (expense.paymentMethod === 'vista' || expense.status === 'paga');

  const totalAmount = parentExpense ? parentExpense.amount : expense.amount;
  const memberQuota = totalAmount / 2;
  const memberInstallment = isInstallment ? (totalAmount / (expense.installments || 1)) / 2 : 0;

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
              {isPaid ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase">
                  PAGA
                </span>
              ) : (
                !isPaid && expense.paymentMethod === 'vista' && (
                  (memberRole === 'A' ? expense.statusB === 'paga' : expense.statusA === 'paga') && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase border border-amber-200">
                      Paga por {members?.find(m => m.id === expense.payerId)?.nickname || 'parceiro'}
                    </span>
                  )
                )
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor Total</p>
            <p className="text-lg font-black text-slate-900">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sua Cota (Total)</p>
            <p className="text-lg font-black text-emerald-700">{formatCurrency(memberQuota)}</p>
          </div>
        </div>

        {isInstallment && (
          <div className="rounded-2xl bg-indigo-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Sua Parcela Individual</p>
              <p className="text-xs font-medium text-indigo-400 mt-0.5">Ref. {expense.installmentNumber || 1}/{expense.installments}</p>
            </div>
            <p className="text-xl font-black text-indigo-700">{formatCurrency(memberInstallment)}</p>
          </div>
        )}

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
          {!isPaid && onUpdateExpense ? (
            <Button
              disabled={!!expense.pendingEditData}
              onClick={() => {
                const updatedExpense = { ...expense };
                if (memberRole === 'A') updatedExpense.statusA = 'paga';
                else if (memberRole === 'B') updatedExpense.statusB = 'paga';
                else updatedExpense.status = 'paga';
                
                onUpdateExpense(updatedExpense);
                onClose();
              }}
              variant="success"
              className={`flex-1 ${!!expense.pendingEditData ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
              {!!expense.pendingEditData ? 'Edição Pendente' : 'Pagar Minha Cota'}
            </Button>
          ) : isPaid && onUpdateExpense && (
            <Button
              onClick={() => {
                const updatedExpense = { ...expense };
                if (memberRole === 'A') updatedExpense.statusA = 'pendente';
                else if (memberRole === 'B') updatedExpense.statusB = 'pendente';
                else updatedExpense.status = 'pendente';
                
                onUpdateExpense(updatedExpense);
                onClose();
              }}
              variant="outline"
              className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Cancelar Pagamento
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
