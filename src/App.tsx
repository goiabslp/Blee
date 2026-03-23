import React, { useState, useMemo } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { MemberSummary } from './components/MemberSummary';
import { Settings, ChevronLeft, ChevronRight, LogOut, UserPlus } from 'lucide-react';
import { useExpenses } from './hooks/useExpenses';
import { useMembers } from './hooks/useMembers';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/auth/AuthForm';
import { SettingsModal } from './components/layout/SettingsModal';
import { formatCurrency } from './utils/formatters';
import { Button } from './components/ui/Button';
import { PendingEditModal } from './features/members/components/PendingEditModal';
import { Expense } from './types';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { members, updateMember, loading: membersLoading } = useMembers(user?.id);
  
  const userGroupId = members[0]?.userGroupId;
  const { expenses, addExpense, updateExpense, deleteExpense, proposeExpenseEdit, approveExpenseEdit, rejectExpenseEdit, calculateSplit, loading: expensesLoading } = useExpenses(user?.id, userGroupId);
  
  const pendingEditExpense = expenses.find(e => e.pendingEditData && e.pendingEditBy !== user?.id);
  const proposingMember = members.find(m => m.id === pendingEditExpense?.pendingEditBy || m.authUserId === pendingEditExpense?.pendingEditBy);
  const proposingName = proposingMember?.nickname || proposingMember?.fullName || 'O outro membro';

  const [activeScreen, setActiveScreen] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const isTransitioning = React.useRef(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 700 : false);
  const [isTinyMobile, setIsTinyMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 500 : false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const selectedYear = new Date().getFullYear();
  const monthsList = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 700);
      setIsTinyMobile(window.innerWidth < 500);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Derived state for split calculation (kept for other usages if any)
  const splitResult = useMemo(() => {
    if (!members.length || !expenses.length) return { resultA: { balance: 0, totalPaid: 0, shouldPay: 0 }, resultB: { balance: 0, totalPaid: 0, shouldPay: 0 }, total: 0 };
    
    const memA = members.find(m => m.role === 'A');
    const memB = members.find(m => m.role === 'B');
    if (!memA || !memB) return { resultA: { balance: 0, totalPaid: 0, shouldPay: 0 }, resultB: { balance: 0, totalPaid: 0, shouldPay: 0 }, total: 0 };

    // In this new model, we only count 'vista' (cash) expenses that are 'paga' or shared
    const active = expenses.filter(e => e.paymentMethod === 'vista' && (!e.isRecurring || e.generatedFromId));
    
    const totalA = active.filter(e => e.payerId === memA.id && e.statusA === 'paga').reduce((acc, curr) => acc + curr.amount, 0);
    const totalB = active.filter(e => e.payerId === memB.id && e.statusB === 'paga').reduce((acc, curr) => acc + curr.amount, 0);
    
    // splittable only includes 'vista' expenses for the balance
    const splittable = active.filter(e => e.payerId).reduce((acc, curr) => acc + curr.amount, 0);
    const shared = active.filter(e => !e.payerId).reduce((acc, curr) => acc + curr.amount, 0);
    
    const total = splittable + shared;
    const shouldPay = (splittable + shared) / 2;

    return {
      resultA: { totalPaid: totalA, shouldPay, balance: totalA - shouldPay },
      resultB: { totalPaid: totalB, shouldPay, balance: totalB - shouldPay },
      total
    };
  }, [expenses, members]);

  // Derived state for visible expenses (current or future projection)
  const visibleMonthExpenses = useMemo(() => {
    if (!members.length) return [];
    const currentMember = members.find(m => m.authUserId === user?.id) || members[0];

    const currentReqDate = new Date();
    const filtered: Expense[] = [];

    // Actual expenses
    const actualExpenses = expenses.filter(e => {
      if (e.isRecurring && !e.generatedFromId) return false;
      const eDate = new Date(e.date);
      return eDate.getMonth() === selectedMonth && eDate.getFullYear() === selectedYear;
    });

    filtered.push(...actualExpenses);

    // Future projection or template fallback
    const templates = expenses.filter(e => e.isRecurring && !e.generatedFromId);
    
    for (const template of templates) {
      const selectedYearMonth = selectedYear * 12 + selectedMonth;

      if (template.type === 'fixa' && template.recurringDay) {
        const createdDate = new Date(template.date);
        const createdYearMonth = createdDate.getFullYear() * 12 + createdDate.getMonth();

        if (selectedYearMonth >= createdYearMonth) {
          const hasInstanceThisMonth = actualExpenses.some(inst => inst.generatedFromId === template.id);
          if (!hasInstanceThisMonth) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(template.recurringDay).padStart(2, '0')}T12:00:00Z`;
            filtered.push({
              ...template,
              id: `virtual-${template.id}-${selectedMonth}`,
              date: dateStr,
              dueDate: dateStr,
              isRecurring: false,
              generatedFromId: template.id,
              statusA: 'pendente',
              statusB: 'pendente',
              status: 'pendente',
              payerId: undefined
            });
          }
        }
      } else if (template.paymentMethod === 'parcelado' && template.installmentDay && template.installments) {
        const purchaseDate = new Date(template.date);
        const startYearMonth = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth();

        if (selectedYearMonth >= startYearMonth) {
          const monthsDiff = selectedYearMonth - startYearMonth;
          const installmentNum = monthsDiff + 1;

          if (installmentNum <= template.installments) {
            const hasInstanceThisMonth = actualExpenses.some(inst => inst.generatedFromId === template.id);
            if (!hasInstanceThisMonth) {
              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(template.installmentDay).padStart(2, '0')}T12:00:00Z`;
              filtered.push({
                ...template,
                id: `virtual-${template.id}-${selectedMonth}`,
                amount: template.amount / template.installments,
                date: dateStr,
                dueDate: dateStr,
                isRecurring: false,
                generatedFromId: template.id,
                installmentNumber: installmentNum,
                statusA: 'pendente',
                statusB: 'pendente',
                status: 'pendente',
                payerId: undefined
              });
            }
          }
        }
      }
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, members, selectedMonth, selectedYear, user?.id]);

  // Derived state for the indicators (Total Bruto / Saldo Restante)
  const selectedMonthIndicators = useMemo(() => {
    const currentMember = members.find(m => m.authUserId === user?.id) || members[0];
    if (!currentMember || !visibleMonthExpenses.length) return { totalBruto: 0, saldoRestante: 0 };

    let totalBruto = 0;
    let saldoRestante = 0;

    visibleMonthExpenses.forEach(e => {
      const isPaid = currentMember.role === 'A' ? e.statusA === 'paga' : e.statusB === 'paga';
      const myQuota = e.amount / 2;
      totalBruto += myQuota;
      if (!isPaid) saldoRestante += myQuota;
    });

    return { totalBruto, saldoRestante };
  }, [visibleMonthExpenses, members, user?.id]);

  const getMonthStatus = (mIndex: number) => {
    const now = new Date();
    if (selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && mIndex > now.getMonth())) return 'future';

    const currentMember = members.find(m => m.authUserId === user?.id) || members[0];
    if (!currentMember) return 'ok';

    const mExpenses = expenses.filter(e => {
      if (e.isRecurring && !e.generatedFromId) return false;
      const d = new Date(e.date);
      return d.getMonth() === mIndex && d.getFullYear() === selectedYear;
    });

    const templates = expenses.filter(e => e.isRecurring && !e.generatedFromId);
    for (const t of templates) {
      const d = new Date(t.date);
      if (d.getMonth() === mIndex && d.getFullYear() === selectedYear && !mExpenses.some(i => i.generatedFromId === t.id)) {
        mExpenses.push(t);
      }
    }

    if (mExpenses.length === 0) return 'ok';
    const hasPending = mExpenses.some(e => {
      return (currentMember.role === 'A' ? e.statusA !== 'paga' : e.statusB !== 'paga');
    });

    return hasPending ? 'pending' : 'ok';
  };

  const { leftMember, rightMember } = useMemo(() => {
    const mA = members.find(m => m.role === 'A') || null;
    const mB = members.find(m => m.role === 'B') || null;
    
    // Sort by gender if both exist
    if (mA && mB) {
      if (mA.gender === 'M' && mB.gender === 'F') return { leftMember: mA, rightMember: mB };
      if (mA.gender === 'F' && mB.gender === 'M') return { leftMember: mB, rightMember: mA };
      return { leftMember: mA, rightMember: mB };
    }
    
    // If only one exists, put them on the left
    if (mA && !mB) return { leftMember: mA, rightMember: null };
    if (!mA && mB) return { leftMember: mB, rightMember: null };
    
    return { leftMember: null, rightMember: null };
  }, [members]);

  const x = useMotionValue(0);

  const handleDragStart = () => setIsDragging(true);

  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    if (isTransitioning.current) return;

    const threshold = 70; // Aumentado para evitar trocas acidentais
    const velocityThreshold = 200; // Mínimo de velocidade para considerar swipe intencional
    
    if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > velocityThreshold) {
      if (info.offset.x > threshold && activeScreen > 0) {
        isTransitioning.current = true;
        setActiveScreen(activeScreen - 1);
      }
      else if (info.offset.x < -threshold && activeScreen < 2) {
        isTransitioning.current = true;
        setActiveScreen(activeScreen + 1);
      }
    }
  };

  const handleAnimationComplete = () => {
    isTransitioning.current = false;
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>;
  if (!user) return <AuthForm />;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white font-sans text-slate-900">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onSignOut={signOut} 
      />

      <div className="h-full w-full overflow-hidden">
        <motion.div
          className="flex h-full"
          style={{ width: '300%', x, touchAction: 'pan-y' }}
          animate={{ x: `-${activeScreen * 33.33333}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30, mass: 0.8 }}
          drag={false}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onAnimationComplete={handleAnimationComplete}
          whileDrag={{ opacity: 0.8 }}
        >
          <div className="h-full w-1/3 overflow-y-auto bg-slate-50/50">
            {leftMember ? (
              <MemberSummary member={leftMember} isReadOnly={leftMember.authUserId !== user?.id} result={leftMember.role === 'A' ? splitResult.resultA : splitResult.resultB} splitPercentage={50} expenses={expenses} members={members} onAddExpense={addExpense} onUpdateExpense={updateExpense} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-400 shadow-inner">
                  <UserPlus size={32} />
                </div>
                <h2 className="mb-2 text-xl font-black text-slate-800 tracking-tight">Convide seu Parceiro(a)</h2>
                <p className="text-xs font-medium text-slate-500 max-w-[200px]">Acesse as configurações no topo da tela para convidar seu parceiro e liberar esta área.</p>
              </div>
            )}
          </div>

          <div className="h-full w-1/3 overflow-y-auto px-6 pt-24 pb-32">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Despesas</h2>
                {isMobile && <ExpenseForm onAddExpense={addExpense} members={members} isInline />}
              </div>
              <div className="mt-2 flex items-center justify-between rounded-3xl bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Bruto</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedMonthIndicators.totalBruto)}</p>
                  <div className="text-[8px] text-rose-500 font-mono hidden">
                    Debug desativado
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-slate-800" />
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo Restante</p>
                  <p className={`text-xl font-bold ${selectedMonthIndicators.saldoRestante === 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                    {formatCurrency(selectedMonthIndicators.saldoRestante)}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500">
                    {selectedMonthIndicators.saldoRestante === 0 ? 'Tudo pago!' : 'Neste mês'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900 shrink-0">Histórico</h3>
              <div className="flex w-full overflow-x-auto gap-2 pb-2 hide-scrollbar items-center sm:w-auto mask-edges">
                {monthsList.map((month, index) => {
                  const isSelected = selectedMonth === index;
                  const isCurrentMonth = new Date().getMonth() === index && selectedYear === new Date().getFullYear();
                  const status = getMonthStatus(index);
                  
                  return (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(index)}
                      className={`relative px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                        isSelected 
                          ? 'bg-slate-900 text-white shadow-md' 
                          : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {month}
                      
                      {isCurrentMonth && (
                        <span className={`absolute -top-1 -right-1 flex h-2.5 w-2.5 ${isSelected ? 'ring-slate-900' : 'ring-white'} ring-2 rounded-full bg-emerald-500`} />
                      )}
                      
                      {status === 'pending' && !isCurrentMonth && (
                        <span className={`absolute -top-1 -right-1 flex h-2 w-2 ${isSelected ? 'ring-slate-900' : 'ring-white'} ring-2 rounded-full bg-rose-500`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <ExpenseList expenses={visibleMonthExpenses} allExpenses={expenses} onDeleteExpense={deleteExpense} onEditExpense={proposeExpenseEdit} members={members} />
          </div>

          <div className="h-full w-1/3 overflow-y-auto bg-slate-50/50">
            {rightMember ? (
              <MemberSummary member={rightMember} isReadOnly={rightMember.authUserId !== user?.id} result={rightMember.role === 'A' ? splitResult.resultA : splitResult.resultB} splitPercentage={50} expenses={expenses} members={members} onAddExpense={addExpense} onUpdateExpense={updateExpense} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-400 shadow-inner">
                  <UserPlus size={32} />
                </div>
                <h2 className="mb-2 text-xl font-black text-slate-800 tracking-tight">Convide seu Parceiro(a)</h2>
                <p className="text-xs font-medium text-slate-500 max-w-[200px]">Acesse as configurações no topo da tela para convidar seu parceiro e compartilhar despesas.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {!isMobile && (
        <>
          <ExpenseForm onAddExpense={addExpense} members={members} />
          <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/95 px-3 py-2.5 backdrop-blur-md shadow-2xl ring-1 ring-white/10 transition-all hover:bg-slate-900">
            <button
              onClick={() => {
                if (!isTransitioning.current && activeScreen > 0) {
                  isTransitioning.current = true;
                  setActiveScreen(activeScreen - 1);
                }
              }}
              disabled={activeScreen === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20 active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex w-16 justify-center gap-2 px-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    activeScreen === i ? 'w-5 bg-emerald-400 scale-110' : 'w-1.5 bg-slate-600'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                if (!isTransitioning.current && activeScreen < 2) {
                  isTransitioning.current = true;
                  setActiveScreen(activeScreen + 1);
                }
              }}
              disabled={activeScreen === 2}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20 active:scale-95"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} members={members} onUpdateMember={updateMember} />
      <PendingEditModal expense={pendingEditExpense || null} oppositeName={proposingName} onApprove={approveExpenseEdit} onReject={rejectExpenseEdit} />

      {/* Indicadores de Navegação Lateral (Mobile) */}
      <AnimatePresence>
        {isMobile && activeScreen > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isDragging ? 0.2 : 0.6, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            whileHover={{ opacity: 0.9 }}
            whileTap={{ scale: 0.9, opacity: 1 }}
            onClick={() => !isTransitioning.current && setActiveScreen(activeScreen - 1)}
            className="fixed left-0 top-1/2 z-40 -translate-y-1/2 p-4 text-emerald-500 focus:outline-none"
            aria-label="Voltar tela"
          >
            <ChevronLeft size={40} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobile && activeScreen < 2 && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: isDragging ? 0.2 : 0.6, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            whileHover={{ opacity: 0.9 }}
            whileTap={{ scale: 0.9, opacity: 1 }}
            onClick={() => !isTransitioning.current && setActiveScreen(activeScreen + 1)}
            className="fixed right-0 top-1/2 z-40 -translate-y-1/2 p-4 text-emerald-500 focus:outline-none"
            aria-label="Próxima tela"
          >
            <ChevronRight size={40} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
