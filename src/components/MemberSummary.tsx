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
}) => {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [selectedPaymentGroup, setSelectedPaymentGroup] = useState<any | null>(null);

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
    return expenses.filter(e => {
      const isMemberExpense = e.type === 'fixa' || e.type === 'eventual' || e.paymentMethod === 'parcelado' || e.paymentMethod === 'vista' || !e.payerId || e.payerId === member.id;
      if (!isMemberExpense) return false;

      if (e.paymentMethod === 'parcelado' && e.installmentStartMonth && e.installments && e.installmentDay) {
        const [startYear, startMonth] = e.installmentStartMonth.split('-').map(Number);
        const now = new Date();
        const monthsDiff = (now.getFullYear() - startYear) * 12 + (now.getMonth() - (startMonth - 1));
        const currentInstallment = monthsDiff + 1;
        return currentInstallment <= e.installments;
      }
      return true;
    }).sort((a, b) => {
      const aPaid = (a.statusA === 'paga' && a.statusB === 'paga');
      const bPaid = (b.statusA === 'paga' && b.statusB === 'paga');
      
      if (aPaid && !bPaid) return 1;
      if (!aPaid && bPaid) return -1;
      
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [expenses, member.id]);

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
      if (!expense.isRecurring && expense.type !== 'eventual') return;
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

      const nextDate = expense.type === 'eventual' ? new Date(expense.dueDate || expense.date) : getNextPaymentDate(day);
      const dateKey = nextDate.toISOString().split('T')[0];
      const diffTime = nextDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const value = (expense.paymentMethod === 'parcelado' && expense.installments) ? expense.amount / expense.installments : expense.amount;
      const isPaid = member.role === 'A' ? expense.statusA === 'paga' : expense.statusB === 'paga';

      if (!groups[dateKey]) groups[dateKey] = { date: nextDate, total: 0, items: [] };
      if (!isPaid) groups[dateKey].total += value;
      groups[dateKey].items.push({ expense, description: expense.description, installmentInfo, isNear: diffDays <= 3, isPaid });
    });

    return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [memberExpenses, member.id]);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 700 : false);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-full flex-col p-4 pt-20 overflow-y-auto pb-32 bg-slate-50/50">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${themeBg} text-white shadow-lg ${themeShadow}`}>
            <User size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{member.nickname || member.fullName || `Membro ${member.role}`}</h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Perfil Individual • {splitPercentage}%</p>
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
            {memberExpenses.map(expense => {
              const parentExpense = expense.generatedFromId ? expenses.find(e => e.id === expense.generatedFromId) : undefined;
              return (
                <ExpenseItem 
                  key={expense.id} 
                  expense={expense} 
                  parentExpense={parentExpense} 
                  onClick={setSelectedExpense} 
                  memberRole={member.role} 
                  members={members}
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
