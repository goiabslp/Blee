import React, { useState } from 'react';
import { Trash2, User, CreditCard, Calendar, Tag, Edit2, AlertTriangle, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Member } from '../types';
import { formatCurrency, getNextPaymentDate } from '../utils/formatters';
import { Button } from './ui/Button';
import { ExpenseForm } from './ExpenseForm';

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onEditExpense?: (id: string, expense: Partial<Expense>) => void;
  members: Member[];
  allExpenses?: Expense[];
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDeleteExpense, onEditExpense, members, allExpenses }) => {
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const expenseToEdit = expenses.find(e => e.id === editingExpenseId);
  const lookupList = allExpenses || expenses;
  
  const isInstallmentToEdit = expenseToEdit && (expenseToEdit.paymentMethod === 'parcelado' || expenseToEdit.installmentNumber) && expenseToEdit.installments && (expenseToEdit.installments > 1);
  const parentTemplateToEdit = isInstallmentToEdit && expenseToEdit.generatedFromId ? lookupList.find(e => e.id === expenseToEdit.generatedFromId) : undefined;
  const actualExpenseToEdit = parentTemplateToEdit || expenseToEdit;

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-slate-500">
        <Receipt className="mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium">Nenhuma despesa para exibir.</p>
      </div>
    );
  }

  const getTypeName = (type?: string) => {
    switch (type) {
      case 'fixa': return 'Fixas';
      case 'compras': return 'Compras';
      case 'assinaturas': return 'Assinatura';
      default: return 'Compras';
    }
  };

  const getMemberName = (id: string | undefined) => {
    if (!id) return 'Compartilhada';
    const member = members.find(m => m.id === id);
    return member?.nickname || member?.fullName || `Membro ${id}`;
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {expenses.map((expense) => {
          const isTemplate = expense.isRecurring && !expense.generatedFromId;
          const isRecurringItem = expense.type === 'fixa' || expense.type === 'assinaturas';
          const isInstallment = (expense.paymentMethod === 'parcelado' || expense.installmentNumber) && expense.installments && (expense.installments > 1);
          const parentTemplate = isInstallment && expense.generatedFromId ? lookupList.find(e => e.id === expense.generatedFromId) : undefined;
          
          const totalAmount = parentTemplate ? parentTemplate.amount : expense.amount;
          const totalQuota = totalAmount / 2;
          const installmentValue = expense.amount;
          const isFixed = expense.type === 'fixa';
          
          const paymentDateForThisMonth = new Date(expense.date);

          return (
            <motion.div
              key={expense.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`group relative overflow-hidden rounded-3xl border p-5 shadow-sm transition-all hover:shadow-md ${
                !!expense.pendingEditData ? 'border-amber-400 bg-amber-50/40' :
                'border-amber-100 bg-amber-50/20'
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
                    {isRecurringItem && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-600 uppercase">
                        Recorrente
                      </span>
                    )}
                    {expense.installmentNumber && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-600 uppercase">
                        Parcela {expense.installmentNumber}/{expense.installments}
                      </span>
                    )}
                    {!!expense.pendingEditData && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-600 uppercase">
                        <AlertTriangle size={10} />
                        Edição Pendente
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mt-2">
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-bold text-slate-900">{expense.description}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          <Calendar size={12} />
                          {isInstallment && parentTemplate ? `Compra: ${new Date(parentTemplate.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : `Compra: ${new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
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

                      {(isFixed || isInstallment) && (
                        <div className={`mt-3 space-y-0.5 rounded-xl p-2 text-[10px] font-medium max-w-[220px] ${isFixed ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                          <p className="font-bold uppercase tracking-wider text-[9px]">
                            {isFixed ? 'Vencimento (Mensal)' : 'Vencimento Base'}
                          </p>
                          <p>Data: <span className="font-bold">{paymentDateForThisMonth.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-row flex-wrap items-end justify-between md:justify-end gap-x-6 gap-y-3 shrink-0 bg-slate-50/70 md:bg-transparent p-4 md:p-0 rounded-2xl w-full md:w-auto -mx-1 md:mx-0 mt-3 md:mt-0">
                      
                      <div className="flex flex-col items-start md:items-end space-y-1 min-w-[30%] md:min-w-fit">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">Total Bruto</span>
                        <p className="text-base font-bold text-slate-800">{formatCurrency(totalAmount)}</p>
                      </div>

                      <div className="flex flex-col items-start md:items-end space-y-1 min-w-[30%] md:min-w-fit">
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Cota Total</span>
                        <p className="text-base font-bold text-emerald-600">{formatCurrency(totalQuota)}</p>
                      </div>

                      {isInstallment && !isTemplate && (
                        <div className="flex flex-col items-start md:items-end space-y-1 min-w-[30%] md:min-w-fit mt-2 md:mt-0">
                          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                            Sua Parcela ({expense.installmentNumber || 1} de {expense.installments})
                          </span>
                          <p className="text-base font-bold text-indigo-700">{formatCurrency(installmentValue / 2)}</p>
                        </div>
                      )}

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
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!!expense.pendingEditData}
                    onClick={() => setEditingExpenseId(expense.id)}
                    className="h-9 w-9 bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!!expense.pendingEditData}
                    onClick={() => onDeleteExpense(expense.id)}
                    className="h-9 w-9 bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {actualExpenseToEdit && (
        <ExpenseForm
          members={members}
          expenseToEdit={actualExpenseToEdit}
          isOpenExternal={true}
          onCloseExternal={() => setEditingExpenseId(null)}
          onEditExpense={onEditExpense}
        />
      )}
    </div>
  );
};
