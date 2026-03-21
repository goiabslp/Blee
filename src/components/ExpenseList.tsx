import React from 'react';
import { Trash2, User, CreditCard, Calendar, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Member } from '../types';

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  members: Member[];
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDeleteExpense, members }) => {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-sm font-medium">Nenhuma despesa registrada ainda.</p>
        <p className="text-xs">Comece adicionando uma nova despesa acima.</p>
      </div>
    );
  }

  const getTypeName = (type?: string) => {
    if (!type) return 'Compras';
    switch (type) {
      case 'fixa': return 'Fixa';
      case 'compras': return 'Compras';
      case 'assinaturas': return 'Assinaturas';
      default: return 'Compras';
    }
  };

  const getMemberName = (id: string | undefined) => {
    if (!id) return 'Compartilhada';
    const member = members.find(m => m.id === id);
    return member?.nickname || member?.fullName || `Membro ${id}`;
  };

  const formatBRL = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getNextPaymentDate = (day: number) => {
    const now = new Date();
    const nextDate = new Date(now.getFullYear(), now.getMonth(), day);
    if (nextDate < now) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate;
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {expenses.map((expense) => {
          const isTemplate = expense.isRecurring && !expense.generatedFromId;
          const share = expense.amount / 2;
          const isInstallment = (expense.paymentMethod === 'parcelado' || expense.installmentNumber) && expense.installments && expense.installments > 1;
          const isFixed = expense.type === 'fixa';
          
          let currentInstallmentNum = expense.installmentNumber;
          if (isInstallment && isTemplate && expense.installmentStartMonth && expense.installmentDay) {
            const [startYear, startMonth] = expense.installmentStartMonth.split('-').map(Number);
            const now = new Date();
            const monthsDiff = (now.getFullYear() - startYear) * 12 + (now.getMonth() - (startMonth - 1));
            currentInstallmentNum = monthsDiff + 1;
          }

          const dueDay = isFixed ? expense.recurringDay : (isInstallment ? expense.installmentDay : new Date(expense.date).getDate());
          const nextPaymentDate = dueDay ? getNextPaymentDate(dueDay) : null;
          const installmentValue = (isInstallment && isTemplate) ? expense.amount / (expense.installments || 1) : expense.amount;

          return (
            <motion.div
              key={expense.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`group relative overflow-hidden rounded-3xl border p-5 shadow-sm transition-all hover:shadow-md ${
                isTemplate ? 'border-amber-100 bg-amber-50/20' : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      expense.type === 'fixa' ? 'bg-blue-100 text-blue-600' :
                      expense.type === 'assinaturas' ? 'bg-purple-100 text-purple-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {getTypeName(expense.type)}
                    </span>
                    {isTemplate && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-600 uppercase">
                        Recorrente (Template)
                      </span>
                    )}
                    {expense.installmentNumber && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-600 uppercase">
                        Parcela {expense.installmentNumber}/{expense.installments}
                      </span>
                    )}
                    {!isTemplate && !expense.installmentNumber && expense.payerId && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase">
                        Divisão 50/50
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">{expense.description}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          <Calendar size={12} />
                          {isFixed 
                            ? `Vence: Dia ${expense.recurringDay}` 
                            : isInstallment
                              ? `Compra: ${new Date(expense.date).toLocaleDateString('pt-BR')} • Vence: Dia ${expense.installmentDay}`
                              : new Date(expense.date).toLocaleDateString('pt-BR')}
                        </div>
                        {expense.paymentMethod && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                            <CreditCard size={12} />
                            {expense.paymentMethod === 'vista' ? 'À vista' : `Parcelado (${expense.installments}x)`}
                          </div>
                        )}
                        {expense.paymentType && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase">
                            <Tag size={12} />
                            {expense.paymentType === 'dinheiro' ? 'Dinheiro' : 'Cartão'}
                          </div>
                        )}
                      </div>

                      {isFixed && nextPaymentDate && (
                        <div className="mt-2 space-y-0.5 rounded-xl bg-blue-50 p-2 text-[10px] font-medium text-blue-600">
                          <p className="font-bold uppercase tracking-wider text-[9px]">Próximo Pagamento</p>
                          <p>Data: <span className="font-bold">{nextPaymentDate.toLocaleDateString('pt-BR')}</span></p>
                          <p>Cota (Cada): <span className="font-bold">{formatBRL(expense.amount / 2)}</span></p>
                        </div>
                      )}

                      {isInstallment && (
                        <div className="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-[10px] font-medium text-slate-500">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                            <p className="font-bold uppercase tracking-wider text-[9px] text-slate-400">
                              {isTemplate ? 'Plano de Parcelamento' : 'Detalhes da Parcela'}
                            </p>
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[8px] font-bold text-indigo-600 uppercase">
                              {isTemplate ? `${expense.installments}x` : `${expense.installmentNumber}/${expense.installments}`}
                            </span>
                          </div>
                          {isTemplate && <p>Valor Total: <span className="font-bold text-slate-700">{formatBRL(expense.amount)}</span></p>}
                          <p>{isTemplate ? 'Valor da Parcela' : 'Valor desta Parcela'}: <span className="font-bold text-slate-700">{formatBRL(installmentValue)}</span></p>
                          <p>Cota p/ Parcela (Cada): <span className="font-bold text-emerald-600">{formatBRL(installmentValue / 2)}</span></p>
                          {nextPaymentDate && (
                            <p>{isTemplate ? 'Próximo Vencimento' : 'Vencimento'}: <span className="font-bold text-slate-700">{nextPaymentDate.toLocaleDateString('pt-BR')}</span></p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {isTemplate ? 'Total Compra' : 'Valor Parcela'}
                        </p>
                        <p className="text-lg font-bold text-slate-900">{formatBRL(expense.amount)}</p>
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Cota (Cada)</p>
                        <p className="text-sm font-bold text-emerald-600">{formatBRL(expense.amount / 2)}</p>
                      </div>
                    </div>
                  </div>

                  {expense.payerId && expense.paymentMethod !== 'parcelado' && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                        <User size={12} className="text-slate-400" />
                      </div>
                      <p className="text-[10px] font-medium text-slate-600">
                        Pago por <span className="font-bold text-slate-900">{getMemberName(expense.payerId)}</span>
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDeleteExpense(expense.id)}
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100 active:scale-90"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
