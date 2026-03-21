import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, FileText, CreditCard, Hash, Tag, User } from 'lucide-react';
import { Expense, Member } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  members: Member[];
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense, members }) => {
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

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setInstallments('1');
    setInstallmentDay('');
    setPaymentMethod('vista');
    setPaymentType('cartao');
    setType('compras');
    setRecurringDay('');
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    if (type === 'fixa') {
      if (!recurringDay) return;
      const d = parseInt(recurringDay);
      const initialDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T${timeString}-03:00`;

      onAddExpense({
        description,
        amount: parseFloat(amount),
        date: initialDate,
        type,
        isRecurring: true,
        recurringDay: d,
        dueDate: initialDate,
      });
    } else {
      const dateWithTime = `${date}T${timeString}-03:00`;

      if (paymentMethod === 'parcelado') {
        const d = parseInt(installmentDay);
        const purchaseDate = new Date(date);
        let startYear = purchaseDate.getFullYear();
        let startMonth = purchaseDate.getMonth() + 1;

        if (d < purchaseDate.getDate()) {
          startMonth += 1;
          if (startMonth > 12) { startMonth = 1; startYear += 1; }
        }

        onAddExpense({
          description,
          amount: parseFloat(amount),
          date: dateWithTime,
          type,
          payerId: undefined,
          paymentMethod,
          paymentType,
          installments: parseInt(installments),
          installmentDay: d,
          installmentStartMonth: `${startYear}-${String(startMonth).padStart(2, '0')}`,
          isRecurring: true,
        });
      } else {
        onAddExpense({
          description,
          amount: parseFloat(amount),
          date: dateWithTime,
          type,
          payerId,
          paymentMethod,
        });
      }
    }
    resetForm();
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 md:bottom-8">
      <Button
        size="icon"
        className="h-16 w-16 shadow-2xl shadow-emerald-500/40"
        onClick={() => setIsOpen(true)}
      >
        <Plus size={32} />
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nova Despesa" position="bottom">
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
          <Input icon={DollarSign} type="number" step="0.01" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} required />

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
            <Button variant="secondary" className="flex-1" onClick={resetForm}>Cancelar</Button>
            <Button type="submit" className="flex-1">Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
