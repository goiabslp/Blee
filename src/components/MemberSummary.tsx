import React, { useMemo, useState } from 'react';
import { User, TrendingUp, TrendingDown, Wallet, Calendar, Tag, Info, X, CreditCard, Receipt, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SplitResult, Member, Expense } from '../types';

interface MemberSummaryProps {
  member: Member;
  result: SplitResult;
  splitPercentage: number;
  expenses: Expense[];
  members: Member[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense?: (expense: Expense) => void;
}

export const MemberSummary: React.FC<MemberSummaryProps> = ({
  member,
  result,
  splitPercentage,
  expenses,
  members,
  onAddExpense,
  onUpdateExpense,
}) => {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [selectedPaymentGroup, setSelectedPaymentGroup] = useState<{ date: Date; total: number; items: { expense: Expense; description: string; installmentInfo?: string; isNear: boolean; isPaid: boolean }[] } | null>(null);
  
  const consolidatedBalance = result.balance; // Positive = Credit, Negative = Debt
  const isPositive = consolidatedBalance > 0; // Credit
  const isNegative = consolidatedBalance < 0; // Debt
  const isZero = Math.abs(consolidatedBalance) < 0.01;

  const oppositeMember = members.find(m => m.id !== member.id);
  const oppositeName = oppositeMember?.nickname || oppositeMember?.fullName || 'outro membro';

  const isMale = member.gender === 'M';
  const themeColor = isMale ? 'blue' : 'red';
  const themeBg = isMale ? 'bg-blue-500' : 'bg-red-500';
  const themeText = isMale ? 'text-blue-600' : 'text-red-600';
  const themeBorder = isMale ? 'border-blue-100' : 'border-red-100';
  const themeLightBg = isMale ? 'bg-blue-50' : 'bg-red-50';
  const themeShadow = isMale ? 'shadow-blue-500/20' : 'shadow-red-500/20';

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

  const handleZeroDebt = () => {
    if (consolidatedBalance <= 0 || !oppositeMember) return;

    const amountToZero = consolidatedBalance * 2;
    
    onAddExpense({
      description: 'Ajuste/Zeramento de dívida',
      amount: amountToZero,
      date: new Date().toISOString(),
      type: 'compras',
      payerId: oppositeMember.id,
      paymentMethod: 'vista',
      paymentType: 'dinheiro',
    });
  };

  const memberExpenses = useMemo(() => {
    return expenses.filter(e => {
      const isMemberExpense = e.type === 'fixa' || e.paymentMethod === 'parcelado' || !e.payerId || e.payerId === member.id;
      if (!isMemberExpense) return false;

      if (e.paymentMethod === 'parcelado' && e.installmentStartMonth && e.installments && e.installmentDay) {
        const [startYear, startMonth] = e.installmentStartMonth.split('-').map(Number);
        const now = new Date();
        const monthsDiff = (now.getFullYear() - startYear) * 12 + (now.getMonth() - (startMonth - 1));
        const currentInstallment = monthsDiff + 1;
        return currentInstallment <= e.installments;
      }
      return true;
    });
  }, [expenses, member.id]);

  // Statement calculation logic
  const statementMovements = useMemo(() => {
    // Filter out templates and expenses without payer (as they don't affect balance in App.tsx)
    const activeExpenses = expenses.filter(e => (!e.isRecurring || e.generatedFromId) && e.payerId);
    
    // Reverse the array to get insertion order (oldest first) so that new payments 
    // are always added at the bottom and don't change previous balances.
    const sorted = [...activeExpenses].reverse();
    
    let currentAccBalance = 0;
    const movements = sorted.map(expense => {
      // Impact on this member's balance (Positive = Credit, Negative = Debt)
      // If I paid: impact = + (amount * 0.5)
      // If other paid: impact = - (amount * 0.5)
      const isPayer = expense.payerId === member.id;
      const impact = isPayer ? (expense.amount * 0.5) : -(expense.amount * 0.5);
      
      currentAccBalance += impact;
      
      const payer = members.find(m => m.id === expense.payerId);
      const payerName = payer?.nickname || payer?.fullName || 'Desconhecido';
      
      return {
        id: expense.id,
        description: expense.description,
        totalAmount: expense.amount,
        value: impact,
        date: expense.date,
        accBalance: currentAccBalance,
        payerName
      };
    });

    // Return ascending for display (oldest to newest)
    return movements;
  }, [expenses, member.id, members]);

  // Grouping logic for "Próximos Pagamentos"
  const nextPayments = useMemo(() => {
    const groups: Record<string, { date: Date; total: number; items: { expense: Expense; description: string; installmentInfo?: string; isNear: boolean; isPaid: boolean }[] }> = {};
    const now = new Date();

    memberExpenses.forEach(expense => {
      if (!expense.isRecurring) return;

      let day: number;
      let installmentInfo: string | undefined;

      if (expense.type === 'fixa' && expense.recurringDay) {
        day = expense.recurringDay;
      } else if (expense.paymentMethod === 'parcelado' && expense.installmentDay) {
        day = expense.installmentDay;
        
        const [startYear, startMonth] = expense.installmentStartMonth!.split('-').map(Number);
        const nextDate = getNextPaymentDate(day);
        const monthsDiff = (nextDate.getFullYear() - startYear) * 12 + (nextDate.getMonth() - (startMonth - 1));
        const installmentNum = monthsDiff + 1;
        
        if (installmentNum > expense.installments!) return;
        installmentInfo = `Parcela ${installmentNum}/${expense.installments}`;
      } else {
        const dateObj = new Date(expense.dueDate || expense.date);
        day = dateObj.getDate();
      }

      const nextDate = getNextPaymentDate(day);
      const dateKey = nextDate.toISOString().split('T')[0];
      
      // Check if it's within 3 days
      const diffTime = nextDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isNear = diffDays <= 3;
      const isPaid = expense.status === 'paga' || expense.paymentMethod === 'vista';

      if (!groups[dateKey]) {
        groups[dateKey] = { date: nextDate, total: 0, items: [] };
      }

      const value = (expense.paymentMethod === 'parcelado' && expense.installments) 
        ? expense.amount / expense.installments 
        : expense.amount;
      
      if (!isPaid) {
        groups[dateKey].total += value;
      }
      groups[dateKey].items.push({ expense, description: expense.description, installmentInfo, isNear, isPaid });
    });

    return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [memberExpenses]);

  return (
    <div className="flex h-full flex-col p-4 pt-20 overflow-y-auto pb-32 bg-slate-50/50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-3"
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${themeBg} text-white shadow-lg ${themeShadow}`}>
          <User size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">{member.nickname || member.fullName || `Membro ${member.id}`}</h2>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Perfil Individual • {splitPercentage}%
          </p>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Resumo Financeiro */}
        <section className="w-full md:w-1/2 flex flex-col">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Wallet size={12} /> Resumo Financeiro
          </h3>
          <div className="grid grid-cols-1 gap-3 flex-1">
            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between h-full"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo Atual Consolidado</p>
                  <p className={`text-3xl font-black ${isZero ? 'text-slate-600' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatBRL(Math.abs(consolidatedBalance))}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isZero ? 'bg-slate-50 text-slate-400' : isPositive ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                  {isZero ? <Wallet size={24} /> : isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isZero ? 'bg-slate-300' : isPositive ? 'bg-emerald-500' : 'bg-rose-500'} ${!isZero && 'animate-pulse'}`} />
                  <p className="text-xs font-bold text-slate-600">
                    {isZero 
                      ? "Tudo certo por aqui, ninguém deve nada a ninguém" 
                      : isPositive 
                        ? `${oppositeName} te deve o valor acima` 
                        : `Você deve pagar o valor acima para ${oppositeName}`}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setIsStatementOpen(true)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${themeBg} text-white shadow-md ${themeShadow}`}
                  >
                    <Receipt size={14} />
                    Extrato
                  </button>
                  <button
                    onClick={handleZeroDebt}
                    disabled={consolidatedBalance <= 0}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      consolidatedBalance > 0 
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 hover:bg-slate-800' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle size={14} />
                    Zerar Dívida
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Próximos Pagamentos */}
        <section className="w-full md:w-1/2 flex flex-col">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Clock size={12} /> Próximos Pagamentos
          </h3>
          {nextPayments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-[10px] text-slate-400 italic">Nenhum pagamento futuro projetado.</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar flex-1">
              {nextPayments.map((group) => {
                const isToday = group.date.toDateString() === new Date().toDateString();
                const isNear = group.items.some(i => i.isNear);
                
                return (
                  <motion.div
                    key={group.date.toISOString()}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPaymentGroup(group)}
                    className={`min-w-[200px] flex-shrink-0 rounded-2xl border p-4 shadow-sm flex flex-col cursor-pointer transition-colors hover:bg-slate-50 ${
                      isToday ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/50' : isNear ? `${themeBorder} ${themeLightBg}` : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <span className={`text-sm font-black uppercase tracking-wider ${isToday ? 'text-amber-600' : isNear ? themeText : 'text-slate-800'}`}>
                          {isToday ? 'HOJE' : group.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Vencimento</p>
                      </div>
                      {isNear && <AlertCircle size={16} className={isToday ? 'text-amber-500' : themeText} />}
                    </div>
                    
                    <div className="mb-4 flex-1 flex items-center">
                      <div className="flex items-center gap-2 rounded-lg bg-slate-100/50 px-3 py-2">
                        <Receipt size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">
                          {group.items.length} {group.items.length === 1 ? 'despesa' : 'despesas'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-slate-200/60 pt-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Sua Cota</p>
                      <p className={`text-xl font-black ${isToday ? 'text-amber-700' : isNear ? themeText : 'text-slate-900'}`}>
                        {formatBRL(group.total / 2)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Minhas Despesas */}
      <section className="mb-8">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Receipt size={12} /> Minhas Despesas
        </h3>
        {memberExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Tag size={24} className="mx-auto mb-2 text-slate-200" />
            <p className="text-[10px] font-medium text-slate-400">Nenhuma despesa vinculada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {memberExpenses.map((expense) => {
              const isInstallment = (expense.paymentMethod === 'parcelado' || expense.installmentNumber) && expense.installments && expense.installments > 1;
              const isFixed = expense.type === 'fixa';
              const isPaid = expense.paymentMethod === 'vista' || expense.status === 'paga';
              const share = expense.amount / 2;

              return (
                <motion.div
                  key={expense.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedExpense(expense)}
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
                    <p className="text-xs font-black text-slate-900">{formatBRL(expense.amount)}</p>
                    <p className="text-[9px] font-bold text-emerald-600">Cota: {formatBRL(share)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Payment Group Modal */}
      <AnimatePresence>
        {selectedPaymentGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPaymentGroup(null)}
              className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed inset-x-4 bottom-10 z-[110] max-h-[80vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:left-1/2 md:w-[400px] md:-translate-x-1/2"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-black text-slate-900">Vencimento</h4>
                  <p className="text-sm font-medium text-slate-500">
                    {selectedPaymentGroup.date.toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPaymentGroup(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total do Dia</p>
                    <p className="text-lg font-black text-slate-900">{formatBRL(selectedPaymentGroup.total)}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sua Cota (50%)</p>
                    <p className="text-lg font-black text-emerald-700">{formatBRL(selectedPaymentGroup.total / 2)}</p>
                  </div>
                </div>

                <div>
                  <h5 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Despesas ({selectedPaymentGroup.items.length})</h5>
                  <div className="space-y-3">
                    {selectedPaymentGroup.items.map((item, idx) => {
                      const isInstallment = (item.expense.paymentMethod === 'parcelado' || item.expense.installmentNumber) && item.expense.installments && item.expense.installments > 1;
                      const isFixed = item.expense.type === 'fixa';
                      
                      return (
                        <div key={idx} className="flex flex-col gap-2 rounded-2xl border border-slate-100 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${isFixed ? 'bg-blue-50 text-blue-500' : isInstallment ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                {isFixed ? <Clock size={12} /> : isInstallment ? <CreditCard size={12} /> : <Tag size={12} />}
                              </div>
                              <p className={`text-sm font-bold ${item.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                {item.description}
                              </p>
                            </div>
                            {item.isPaid && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700">PAGO</span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between pl-8">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-medium text-slate-400">
                                {item.installmentInfo || (isFixed ? 'Mensal' : 'À Vista')}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-black ${item.isPaid ? 'text-slate-400' : 'text-slate-900'}`}>
                                {formatBRL(item.expense.amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPaymentGroup(null)}
                  className={`w-full rounded-2xl ${themeBg} py-4 text-sm font-bold text-white shadow-lg ${themeShadow}`}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Expense Detail Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExpense(null)}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed inset-x-4 bottom-10 z-[110] rounded-3xl bg-white p-6 shadow-2xl md:left-1/2 md:w-[400px] md:-translate-x-1/2"
            >
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900">Detalhes da Despesa</h4>
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${themeBg} text-white shadow-lg ${themeShadow}`}>
                    <Receipt size={28} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900">{selectedExpense.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase">
                        {selectedExpense.type || 'Compra'}
                      </span>
                      {(selectedExpense.paymentMethod === 'vista' || selectedExpense.status === 'paga') && (
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
                    <p className="text-lg font-black text-slate-900">{formatBRL(selectedExpense.amount)}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sua Cota (50%)</p>
                    <p className="text-lg font-black text-emerald-700">{formatBRL(selectedExpense.amount / 2)}</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={14} />
                      <span>Data</span>
                    </div>
                    <span className="font-bold text-slate-900">{new Date(selectedExpense.date).toLocaleDateString('pt-BR')}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <CreditCard size={14} />
                      <span>Pagamento</span>
                    </div>
                    <span className="font-bold text-slate-900 uppercase">
                      {selectedExpense.paymentMethod === 'parcelado' ? 'Parcelado' : 'À Vista'}
                    </span>
                  </div>

                  {selectedExpense.installments && (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Info size={14} />
                        <span>Parcelas</span>
                      </div>
                      <span className="font-bold text-indigo-600">
                        {selectedExpense.installmentNumber || 1} de {selectedExpense.installments}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Tag size={14} />
                      <span>Método</span>
                    </div>
                    <span className="font-bold text-slate-900 uppercase">
                      {selectedExpense.paymentType === 'dinheiro' ? 'Dinheiro' : 'Cartão'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {selectedExpense.paymentMethod !== 'vista' && selectedExpense.status !== 'paga' && onUpdateExpense && (
                    <button
                      onClick={() => {
                        onUpdateExpense({ ...selectedExpense, status: 'paga' });
                        setSelectedExpense(null);
                      }}
                      className="flex-1 rounded-2xl bg-emerald-500 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600"
                    >
                      Pagar
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedExpense(null)}
                    className={`flex-1 rounded-2xl ${themeBg} py-4 text-sm font-bold text-white shadow-lg ${themeShadow}`}
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Statement Modal */}
      <AnimatePresence>
        {isStatementOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStatementOpen(false)}
              className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="fixed inset-x-0 bottom-0 z-[130] flex h-[85vh] flex-col rounded-t-[40px] bg-white shadow-2xl md:left-1/2 md:w-[500px] md:-translate-x-1/2"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h4 className="text-xl font-black text-slate-900">Extrato Detalhado</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Movimentações de {member.nickname}</p>
                </div>
                <button
                  onClick={() => setIsStatementOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {statementMovements.length === 0 ? (
                  <div className="py-20 text-center">
                    <AlertCircle size={40} className="mx-auto mb-4 text-slate-200" />
                    <p className="text-sm font-medium text-slate-400">Nenhuma movimentação registrada.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {statementMovements.map((move, idx) => {
                      const dateString = move.date.includes('T') ? move.date : `${move.date}T00:00:00-03:00`;
                      const dateObj = new Date(dateString);
                      const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(dateObj);

                      return (
                      <div key={move.id} className="relative">
                        {/* Timeline Line */}
                        {idx !== statementMovements.length - 1 && (
                          <div className="absolute left-6 top-10 bottom-0 w-[1px] bg-slate-100" />
                        )}
                        
                        <div className="flex items-start gap-4 py-3">
                          <div className={`z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-4 border-white shadow-sm ${move.value > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                            {move.value > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-0.5">
                              <p className="truncate text-sm font-bold text-slate-900">{move.description}</p>
                              <div className="text-right flex-shrink-0 ml-2">
                                <p className={`text-sm font-black ${move.value > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {move.value > 0 ? '+' : ''}{formatBRL(Math.abs(move.value))}
                                </p>
                                <p className="text-[10px] font-normal text-slate-500 leading-tight">
                                  Saldo: <span className={move.accBalance > 0 ? 'text-emerald-600' : move.accBalance < 0 ? 'text-rose-600' : 'text-slate-900'}>
                                    {formatBRL(Math.abs(move.accBalance))}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <p className="text-[10px] font-medium text-slate-500">
                                <span className="font-bold">{move.payerName}</span> <span className="mx-1">|</span> {formattedDate}
                              </p>
                              <p className="text-[10px] font-medium text-slate-500">Total: <span className="font-bold">{formatBRL(move.totalAmount)}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-[40px]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo Final Consolidado</p>
                    <p className={`text-2xl font-black ${isZero ? 'text-slate-900' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatBRL(Math.abs(consolidatedBalance))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${isZero ? 'text-slate-500' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isZero ? 'Tudo em dia' : isPositive ? 'Crédito' : 'Débito'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
