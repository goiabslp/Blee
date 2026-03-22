import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, FileText, CreditCard, Hash, Tag, User } from 'lucide-react';
import { Expense, Member } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';

interface ExpenseFormProps {
  onAddExpense?: (expense: Omit<Expense, 'id'>) => void;
  onEditExpense?: (id: string, expense: Partial<Expense>) => void;
  expenseToEdit?: Expense;
  members: Member[];
  isInline?: boolean;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense, onEditExpense, expenseToEdit, members, isInline, isOpenExternal, onCloseExternal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurringDay, setRecurringDay] = useState('');
  const [type, setType] = useState<'fixa' | 'compras' | 'assinaturas'>('compras');
  const memberA = members.find(m => m.role === 'A');
  const memberB = members.find(m => m.role === 'B');
  const [payerId, setPayerId] = useState<string>('');

  React.useEffect(() => {
    if (memberA && !payerId) {
      setPayerId(memberA.id);
    }
  }, [memberA, payerId]);
  const [paymentMethod, setPaymentMethod] = useState<'vista' | 'parcelado'>('vista');
  const [paymentType, setPaymentType] = useState<'dinheiro' | 'cartao'>('cartao');
  const [installments, setInstallments] = useState('1');
  const [installmentDay, setInstallmentDay] = useState('');

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) value = value.slice(0, 2);
    const d = parseInt(value);
    if (d > 31) value = '31';
    setter(value);
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amountVal = Number(numbers) / 100;
    return amountVal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatCurrency(e.target.value));
  };

  const resetForm = () => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      const amountInCents = Math.round((expenseToEdit.amount || 0) * 100);
      setAmount(formatCurrency(amountInCents.toString()));
      setDate((expenseToEdit.date || new Date().toISOString()).split('T')[0]);
      setType(expenseToEdit.type || 'compras');
      setPaymentMethod(expenseToEdit.paymentMethod || 'vista');
      setPaymentType(expenseToEdit.paymentType || 'cartao');
      setInstallments((expenseToEdit.installments || 1).toString());
      setInstallmentDay((expenseToEdit.installmentDay || '').toString());
      setRecurringDay((expenseToEdit.recurringDay || '').toString());
      setPayerId(expenseToEdit.payerId || memberA?.id || '');
    } else {
      setDescription('');
      setAmount('');
      setInstallments('1');
      setInstallmentDay('');
      setPaymentMethod('vista');
      setPaymentType('cartao');
      setType('compras');
      setRecurringDay('');
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (isOpenExternal || isOpen) {
      resetForm();
    }
  }, [isOpenExternal, isOpen, expenseToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount.replace(/\D/g, '')) / 100;
    if (!description || numericAmount <= 0) return;
    
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const submitData: Partial<Expense> = {
      description,
      amount: numericAmount,
      type,
    };

    if (type === 'fixa') {
      if (!recurringDay) return;
      const d = parseInt(recurringDay);
      const initialDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T${timeString}-03:00`;
      
      submitData.date = initialDate;
      submitData.dueDate = initialDate;
      submitData.isRecurring = true;
      submitData.recurringDay = d;
    } else {
      const dateWithTime = `${date}T${timeString}-03:00`;
      submitData.date = dateWithTime;
      submitData.paymentMethod = paymentMethod;
      submitData.paymentType = paymentType;

      if (paymentMethod === 'parcelado') {
        submitData.installments = parseInt(installments);
        submitData.installmentDay = parseInt(installmentDay);
        submitData.installmentStartMonth = date.substring(0, 7);
        submitData.isRecurring = true;
      } else {
        const payer = members.find(m => m.id === payerId);
        submitData.payerId = payerId;
        submitData.status = 'paga'; // Marcar como pago no geral (à vista)
        
        if (payer?.role === 'A') {
          submitData.statusA = 'paga';
          submitData.statusB = 'pendente';
        } else if (payer?.role === 'B') {
          submitData.statusA = 'pendente';
          submitData.statusB = 'paga';
        } else {
          // Fallback caso não identifique
          submitData.statusA = 'paga';
          submitData.statusB = 'paga';
        }
      }
    }

    if (expenseToEdit && onEditExpense) {
      onEditExpense(expenseToEdit.id, submitData);
      if (onCloseExternal) onCloseExternal();
    } else if (onAddExpense) {
      onAddExpense(submitData as any);
    }
    
    if (!expenseToEdit) resetForm();
  };

  return (
    <>
      {isOpenExternal === undefined && (
        <div className={isInline ? "inline-block" : "fixed bottom-24 right-6 z-50 md:bottom-8"}>
          {isInline ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95"
            >
              <Plus size={14} />
              <span>Nova Despesa</span>
            </button>
          ) : (
            <Button
              size="icon"
              className="h-16 w-16 shadow-2xl shadow-emerald-500/40"
              onClick={() => setIsOpen(true)}
            >
              <Plus size={32} />
            </Button>
          )}
        </div>
      )}

      <Modal isOpen={isOpenExternal ?? isOpen} onClose={onCloseExternal || (() => setIsOpen(false))} title={expenseToEdit ? "Editar Despesa" : "Nova Despesa"} position="bottom">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tipo de Despesa</label>
            <div className="flex flex-wrap gap-2">
              {(['fixa', 'compras', 'assinaturas'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-all ${
                    type === t ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500'
                  }`}
                >
                  <Tag size={14} />
                  {t === 'fixa' ? 'Fixa' : t === 'compras' ? 'Compras' : 'Assinaturas'}
                </button>
              ))}
            </div>
          </div>

          <Input icon={FileText} placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <Input icon={DollarSign} type="text" inputMode="numeric" placeholder="Valor" value={amount} onChange={handleAmountChange} required />

          <div className="relative">
            {type === 'fixa' ? (
              <Input label="Vencimento (Dia)" icon={Calendar} placeholder="Ex: 15" value={recurringDay} onChange={(e) => handleDayChange(e, setRecurringDay)} required />
            ) : (
              <Input label="Data da Compra" icon={Calendar} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            )}
          </div>

          {type !== 'fixa' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Forma de Pagamento</label>
                <div className="flex gap-2">
                  {(['vista', 'parcelado'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                        paymentMethod === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <CreditCard size={16} />
                      {m === 'vista' ? 'À vista' : 'Parcelado'}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'parcelado' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Pagamento</label>
                    <div className="flex gap-2">
                      {(['dinheiro', 'cartao'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPaymentType(p)}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                            paymentType === p ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500'
                          }`}
                        >
                          {p === 'dinheiro' ? 'Dinheiro' : 'Cartão'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input label="Quantidade de Parcelas" icon={Hash} type="number" min="1" placeholder="Ex: 12" value={installments} onChange={(e) => setInstallments(e.target.value)} required />
                  <Input label="Dia de Vencimento (DD)" icon={Calendar} placeholder="Ex: 15" value={installmentDay} onChange={(e) => handleDayChange(e, setInstallmentDay)} required />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Quem pagou?</label>
                  <div className="flex gap-2">
                      {[memberA, memberB].filter(Boolean).map(m => (
                        <button
                          key={m!.id}
                          type="button"
                          onClick={() => setPayerId(m!.id as any)}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                            payerId === m!.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <User size={16} />
                          {m!.nickname}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={onCloseExternal || (() => setIsOpen(false))}>Cancelar</Button>
            <Button type="submit" className="flex-1">{expenseToEdit ? "Propor Edição" : "Salvar"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
