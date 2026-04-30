import React, { useMemo, useState } from 'react';
import { User, Wallet, Receipt, Clock, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { SplitResult, Member, Expense } from '../types';
import { formatCurrency, getNextPaymentDate } from '../utils/formatters';
import { ExpenseItem } from './ExpenseItem';
import { ExpenseForm } from './ExpenseForm';
import { BalanceCard } from '../features/members/components/BalanceCard';
import { NextPaymentsList } from '../features/members/components/NextPaymentsList';
import { ExpenseDetailModal } from '../features/members/components/ExpenseDetailModal';
import { PaymentGroupModal } from '../features/members/components/PaymentGroupModal';
import { StatementModal } from '../features/members/components/StatementModal';

interface MemberSummaryProps {
  member: Member;
  result: SplitResult;
  splitPercentage: number;
  expenses: Expense[];
  members: Member[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense?: (expense: Expense) => void;
  isReadOnly?: boolean;
  visibleMonthExpenses?: Expense[];
  selectedMonth?: number;
  selectedYear?: number;
  onMonthChange?: (m: number) => void;
}

export const MemberSummary: React.FC<MemberSummaryProps> = ({
  member,
  result,
  splitPercentage,
  expenses,
  members,
  onAddExpense,
  onUpdateExpense,
  isReadOnly = false,
  visibleMonthExpenses = [],
  selectedMonth = new Date().getMonth(),
  selectedYear = new Date().getFullYear(),
  onMonthChange,
}) => {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [selectedPaymentGroup, setSelectedPaymentGroup] = useState<any | null>(null);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  const toggleSelection = (expense: Expense) => {
    setSelectedExpenses(prev => {
      const next = new Set(prev);
      if (next.has(expense.id)) next.delete(expense.id);
      else next.add(expense.id);
      return next;
    });
  };

  const handlePaySelected = () => {
    if (!onUpdateExpense) return;
    for (const id of Array.from(selectedExpenses)) {
      const exp = expenses.find(e => e.id === id) || visibleMonthExpenses.find(e => e.id === id);
      if (exp) {
        const updatedExp = { ...exp };
        if (member.role === 'A') updatedExp.statusA = 'paga';
        else updatedExp.statusB = 'paga';
        onUpdateExpense(updatedExp);
      }
    }
    setSelectedExpenses(new Set());
  };

  const consolidatedBalance = result.balance;
  const isPositive = consolidatedBalance > 0;
  const isZero = Math.abs(consolidatedBalance) < 0.01;

  const oppositeMember = members.find(m => m.id !== member.id);
  const oppositeName = oppositeMember?.nickname || oppositeMember?.fullName || 'outro membro';

  const isMale = member.gender === 'M';
  const themeBg = isMale ? 'bg-blue-500' : 'bg-red-500';
  const themeText = isMale ? 'text-blue-600' : 'text-red-600';
  const themeBorder = isMale ? 'border-blue-100' : 'border-red-100';
  const themeLightBg = isMale ? 'bg-blue-50' : 'bg-red-50';
  const themeShadow = isMale ? 'shadow-blue-500/20' : 'shadow-red-500/20';

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
    // If we have selectedMonth and visibleMonthExpenses, we use those to properly populate the primary month view.
    // We combine the items belonging to selectedMonth, PLUS any pending/overdue debts from earlier months.
    
    // 1. Identify older pending debts from the raw `expenses` list
    const olderPendingExpenses = expenses.filter(e => {
      const isMemberExpense = e.type === 'fixa' || e.type === 'eventual' || e.paymentMethod === 'parcelado' || e.paymentMethod === 'vista' || !e.payerId || e.payerId === member.id;
      if (!isMemberExpense) return false;

      // Do not pull raw base templates if they are installments or fixas and we use visibleMonthExpenses for the current month
      const isTemplate = e.isRecurring && !e.generatedFromId;
      if (isTemplate) return false;

      const expenseDate = new Date(e.dueDate || e.date);
      const expenseMonth = expenseDate.getFullYear() * 12 + expenseDate.getMonth();
      const targetMonth = selectedYear * 12 + selectedMonth;

      // Only care about strictly older months
      if (expenseMonth >= targetMonth) return false;

      const isPaidByMe = member.role === 'A' ? e.statusA === 'paga' : e.statusB === 'paga';
      if (isPaidByMe) return false; // Hide if paid

      return true;
    });

    // 2. Identify the expenses that actively BELONG to the selected month
    const currentViewExpenses = visibleMonthExpenses.filter(e => {
      return e.type === 'fixa' || e.type === 'eventual' || e.paymentMethod === 'parcelado' || e.paymentMethod === 'vista' || !e.payerId || e.payerId === member.id;
    });

    // Combine and deduplicate
    const combinedMap = new Map<string, Expense>();
    [...olderPendingExpenses, ...currentViewExpenses].forEach(e => combinedMap.set(e.id, e));

    return Array.from(combinedMap.values()).sort((a, b) => {
      const aPaid = (a.statusA === 'paga' && a.statusB === 'paga');
      const bPaid = (b.statusA === 'paga' && b.statusB === 'paga');
      
      if (aPaid && !bPaid) return 1;
      if (!aPaid && bPaid) return -1;
      
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [expenses, visibleMonthExpenses, member.id, selectedMonth, selectedYear, member.role]);

  const selectedTotal = useMemo(() => {
    let total = 0;
    memberExpenses.forEach(e => {
      if (selectedExpenses.has(e.id)) {
        const isInstallment = (e.paymentMethod === 'parcelado' || e.installmentNumber) && e.installments && e.installments > 1;
        const parent = e.generatedFromId ? expenses.find(pe => pe.id === e.generatedFromId) : undefined;
        const totalAmount = parent ? parent.amount : e.amount;
        const value = isInstallment ? (totalAmount / (e.installments || 1)) / 2 : totalAmount / 2;
        total += value;
      }
    });
    return total;
  }, [selectedExpenses, memberExpenses, expenses]);

  const statementMovements = useMemo(() => {
    // Only show 'vista' (cash) expenses that the member has marked as 'paga'
    const paidExpenses = expenses.filter(e => {
      const isPaid = member.role === 'A' ? e.statusA === 'paga' : e.statusB === 'paga';
      const isCash = e.paymentMethod === 'vista';
      return isPaid && isCash && (!e.isRecurring || e.generatedFromId);
    });

    const sorted = [...paidExpenses].reverse();
    let currentAccBalance = 0;

    return sorted.map(expense => {
      const isPayer = expense.payerId === member.id;
      // In this new model, we calculate contribution based on what was paid
      const impact = isPayer ? (expense.amount * 0.5) : -(expense.amount * 0.5);
      currentAccBalance += impact;
      const payer = members.find(m => m.id === expense.payerId);

      return {
        id: expense.id,
        description: expense.description,
        totalAmount: expense.amount,
        value: impact,
        date: expense.date,
        accBalance: currentAccBalance,
        payerName: payer?.nickname || payer?.fullName || 'Desconhecido'
      };
    });
  }, [expenses, member.id, member.role, members]);

  const nextPayments = useMemo(() => {
    const groups: Record<string, any> = {};
    const now = new Date();

    memberExpenses.forEach(expense => {
      // Only show expected future-type payments
      if (expense.type !== 'fixa' && expense.type !== 'eventual' && expense.paymentMethod !== 'parcelado') {
        return;
      }

      let nextDate = new Date(expense.dueDate || expense.date);

      // Force +1 month display shift exactly as in ExpenseList.tsx
      const purchaseDate = new Date(expense.date);
      if (!expense.dueDate || (nextDate.getUTCMonth() === purchaseDate.getUTCMonth() && nextDate.getUTCFullYear() === purchaseDate.getUTCFullYear())) {
         nextDate = new Date(purchaseDate.getUTCFullYear(), purchaseDate.getUTCMonth() + 1, purchaseDate.getUTCDate(), 12, 0, 0);
      }

      const dateKey = nextDate.toISOString().split('T')[0];
      const diffTime = nextDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const isInstallmentBaseItem = expense.paymentMethod === 'parcelado' && expense.installments && !expense.installmentNumber && !expense.generatedFromId;
      const value = isInstallmentBaseItem ? expense.amount / expense.installments : expense.amount;
      
      const isPaid = member.role === 'A' ? expense.statusA === 'paga' : expense.statusB === 'paga';

      let installmentInfo: string | undefined;
      if (expense.paymentMethod === 'parcelado' && expense.installments) {
        installmentInfo = `Parcela ${expense.installmentNumber || 1}/${expense.installments}`;
      }

      if (!groups[dateKey]) groups[dateKey] = { date: nextDate, total: 0, items: [] };
      if (!isPaid) groups[dateKey].total += value;
      groups[dateKey].items.push({ expense, description: expense.description, installmentInfo, isNear: diffDays <= 3, isPaid });
    });

    return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [memberExpenses, member.id, member.role]);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 700 : false);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-full flex-col p-4 pt-20 overflow-y-auto pb-32 bg-slate-50/50">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${themeBg} text-white shadow-lg ${themeShadow}`}>
            <User size={24} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{member.nickname || member.fullName || `Membro ${member.role}`}</h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Perfil Individual • {splitPercentage}%</p>
            </div>
            
            {onMonthChange && (
              <div className="flex items-center gap-1 rounded-xl bg-white px-2 py-1 shadow-sm border border-slate-100">
                <button 
                  onClick={() => onMonthChange(selectedMonth === 0 ? 11 : selectedMonth - 1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div className="flex flex-col items-center justify-center min-w-[70px]">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${themeText}`}>
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][selectedMonth]}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400">{selectedYear}</span>
                </div>
                <button 
                  onClick={() => onMonthChange(selectedMonth === 11 ? 0 : selectedMonth + 1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {isMobile && !isReadOnly && (
          <div className="flex-shrink-0">
            <ExpenseForm onAddExpense={onAddExpense} members={members} isInline />
          </div>
        )}
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <section className="w-full md:w-1/2 flex flex-col">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Wallet size={12} /> Resumo Financeiro
          </h3>
          <BalanceCard balance={consolidatedBalance} oppositeName={oppositeName} onOpenStatement={() => setIsStatementOpen(true)} onZeroDebt={isReadOnly ? undefined : handleZeroDebt} themeBg={themeBg} themeShadow={themeShadow} />
        </section>

        <section className="w-full md:w-1/2 flex flex-col">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Clock size={12} /> Próximos Pagamentos
          </h3>
          <NextPaymentsList payments={nextPayments} onSelectGroup={setSelectedPaymentGroup} themeText={themeText} themeBorder={themeBorder} themeLightBg={themeLightBg} />
        </section>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Receipt size={12} /> Minhas Despesas
          </h3>
          {selectedExpenses.size > 0 && (
            <button 
              onClick={handlePaySelected}
              className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Pagar Selecionados ({formatCurrency(selectedTotal)})
            </button>
          )}
        </div>
        {memberExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Tag size={24} className="mx-auto mb-2 text-slate-200" />
            <p className="text-[10px] font-medium text-slate-400">Nenhuma despesa vinculada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {memberExpenses.map(expense => {
              const parentExpense = expense.generatedFromId ? expenses.find(e => e.id === expense.generatedFromId) : undefined;
              const isPaid = member.role === 'A' ? expense.statusA === 'paga' : expense.statusB === 'paga';
              return (
                <ExpenseItem 
                  key={expense.id} 
                  expense={expense} 
                  parentExpense={parentExpense} 
                  onClick={setSelectedExpense} 
                  memberRole={member.role} 
                  members={members}
                  isSelected={selectedExpenses.has(expense.id)}
                  onToggleSelect={(!isPaid && !isReadOnly) ? toggleSelection : undefined}
                />
              )
            })}
          </div>
        )}
      </section>

      <ExpenseDetailModal 
        isOpen={!!selectedExpense} 
        onClose={() => setSelectedExpense(null)} 
        expense={selectedExpense} 
        parentExpense={selectedExpense?.generatedFromId ? expenses.find(e => e.id === selectedExpense.generatedFromId) : undefined}
        onUpdateExpense={isReadOnly ? undefined : onUpdateExpense} 
        themeBg={themeBg} 
        themeShadow={themeShadow} 
        memberRole={member.role} 
        members={members}
      />
      <PaymentGroupModal isOpen={!!selectedPaymentGroup} onClose={() => setSelectedPaymentGroup(null)} group={selectedPaymentGroup} themeBg={themeBg} themeShadow={themeShadow} />
      <StatementModal isOpen={isStatementOpen} onClose={() => setIsStatementOpen(false)} member={member} movements={statementMovements} consolidatedBalance={consolidatedBalance} isZero={isZero} isPositive={isPositive} />
    </div>
  );
};
