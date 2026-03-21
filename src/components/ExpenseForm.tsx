import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, User, FileText, CreditCard, Hash, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Member } from '../types';

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  members: Member[];
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense, members }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurringDay, setRecurringDay] = useState(''); // For Day (1-31)
  const [type, setType] = useState<'fixa' | 'compras' | 'assinaturas'>('compras');
  const [payerId, setPayerId] = useState<'A' | 'B'>('A');
  const [paymentMethod, setPaymentMethod] = useState<'vista' | 'parcelado'>('vista');
  const [paymentType, setPaymentType] = useState<'dinheiro' | 'cartao'>('cartao');
  const [installments, setInstallments] = useState('1');
  const [installmentDay, setInstallmentDay] = useState('');

  const memberA = members.find(m => m.id === 'A')!;
  const memberB = members.find(m => m.id === 'B')!;

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) value = value.slice(0, 2);
    const d = parseInt(value);
    if (d > 31) value = '31';
    setter(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    if (type === 'fixa') {
      if (!recurringDay) return;
      const d = parseInt(recurringDay);
      if (d < 1 || d > 31) return;

      // For fixed expenses, we use the current year and month for the initial entry
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const initialDate = `${currentYear}-${currentMonth}-${dayStr}T${timeString}-03:00`;

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
        if (!installments || parseInt(installments) < 1) return;
        if (!installmentDay) return;
        const d = parseInt(installmentDay);
        if (d < 1 || d > 31) return;

        const purchaseDate = new Date(date);
        let startYear = purchaseDate.getFullYear();
        let startMonth = purchaseDate.getMonth() + 1; // 1-12

        // If the installment day has already passed in the purchase month, start next month
        if (d < purchaseDate.getDate()) {
          startMonth += 1;
          if (startMonth > 12) {
            startMonth = 1;
            startYear += 1;
          }
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
          isRecurring: true, // This is a template for monthly generation
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

  return (
    <div className="fixed bottom-24 right-6 z-50 md:bottom-8">
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 transition-transform hover:scale-110 active:scale-95"
        aria-label="Adicionar Despesa"
      >
        <Plus size={32} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="fixed inset-x-4 bottom-8 z-[70] max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:inset-x-auto md:left-1/2 md:w-[400px] md:-translate-x-1/2"
            >
              <h2 className="mb-6 text-xl font-bold text-slate-900">Nova Despesa</h2>
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
                          type === t
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-100 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <Tag size={14} />
                        {t === 'fixa' ? 'Fixa' : t === 'compras' ? 'Compras' : 'Assinaturas'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <FileText className="absolute top-3 left-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Descrição"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pr-4 pl-10 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="relative">
                  <DollarSign className="absolute top-3 left-3 text-slate-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pr-4 pl-10 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="relative">
                  <Calendar className="absolute top-3 left-3 text-slate-400" size={18} />
                  <div className="flex flex-col">
                    <label className="mb-1 pl-10 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {type === 'fixa' ? 'Vencimento (Dia)' : 'Data da Compra'}
                    </label>
                    {type === 'fixa' ? (
                      <input
                        type="text"
                        placeholder="Ex: 15"
                        value={recurringDay}
                        onChange={(e) => handleDayChange(e, setRecurringDay)}
                        className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pr-4 pl-10 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    ) : (
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pr-4 pl-10 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    )}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {type !== 'fixa' && (
                    <motion.div
                      key="extra-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Forma de Pagamento</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('vista')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                              paymentMethod === 'vista'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-100 bg-slate-50 text-slate-500'
                            }`}
                          >
                            <CreditCard size={16} />
                            À vista
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('parcelado')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                              paymentMethod === 'parcelado'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-100 bg-slate-50 text-slate-500'
                            }`}
                          >
                            <CreditCard size={16} />
                            Parcelado
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {paymentMethod === 'parcelado' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 overflow-hidden"
                          >
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Pagamento</label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPaymentType('dinheiro')}
                                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                                    paymentType === 'dinheiro'
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-100 bg-slate-50 text-slate-500'
                                  }`}
                                >
                                  Dinheiro
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentType('cartao')}
                                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                                    paymentType === 'cartao'
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-100 bg-slate-50 text-slate-500'
                                  }`}
                                >
                                  Cartão
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Quantidade de Parcelas</label>
                              <div className="relative">
                                <Hash className="absolute top-3 left-3 text-slate-400" size={18} />
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Ex: 12"
                                  value={installments}
                                  onChange={(e) => setInstallments(e.target.value)}
                                  className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pr-4 pl-10 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                  required={paymentMethod === 'parcelado'}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Dia de Vencimento (DD)</label>
                              <div className="relative">
                                <Calendar className="absolute top-3 left-3 text-slate-400" size={18} />
                                <input
                                  type="text"
                                  placeholder="Ex: 15"
                                  value={installmentDay}
                                  onChange={(e) => handleDayChange(e, setInstallmentDay)}
                                  className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pr-4 pl-10 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                  required={paymentMethod === 'parcelado'}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {paymentMethod !== 'parcelado' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Quem pagou?</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPayerId('A')}
                              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                                payerId === 'A'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-100 bg-slate-50 text-slate-500'
                              }`}
                            >
                              <User size={16} />
                              {memberA.nickname || 'Membro A'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayerId('B')}
                              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${
                                payerId === 'B'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-100 bg-slate-50 text-slate-500'
                              }`}
                            >
                              <User size={16} />
                              {memberB.nickname || 'Membro B'}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-xl bg-slate-100 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
