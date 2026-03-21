import React, { useState, useMemo } from 'react';
import { motion, useMotionValue } from 'motion/react';
import { Header } from './components/Header';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { MemberSummary } from './components/MemberSummary';
import { Settings, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useExpenses } from './hooks/useExpenses';
import { useMembers } from './hooks/useMembers';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/auth/AuthForm';
import { SettingsModal } from './components/layout/SettingsModal';
import { formatCurrency } from './utils/formatters';
import { Button } from './components/ui/Button';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { expenses, addExpense, updateExpense, deleteExpense, calculateSplit, loading: expensesLoading } = useExpenses(user?.id);
  const { members, updateMember, loading: membersLoading } = useMembers(user?.id);
  
  const [activeScreen, setActiveScreen] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Derived state for split calculation
  const splitResult = useMemo(() => {
    if (!members.length || !expenses.length) return { resultA: { balance: 0, totalPaid: 0, shouldPay: 0 }, resultB: { balance: 0, totalPaid: 0, shouldPay: 0 }, total: 0 };
    
    const memA = members.find(m => m.role === 'A');
    const memB = members.find(m => m.role === 'B');
    if (!memA || !memB) return { resultA: { balance: 0, totalPaid: 0, shouldPay: 0 }, resultB: { balance: 0, totalPaid: 0, shouldPay: 0 }, total: 0 };

    const active = expenses.filter(e => !e.is_recurring || e.generated_from_id);
    const totalA = active.filter(e => e.payer_id === memA.id).reduce((acc, curr) => acc + curr.amount, 0);
    const totalB = active.filter(e => e.payer_id === memB.id).reduce((acc, curr) => acc + curr.amount, 0);
    const shared = active.filter(e => !e.payer_id).reduce((acc, curr) => acc + curr.amount, 0);
    
    const total = totalA + totalB + shared;
    const splittable = totalA + totalB;
    const shouldPay = splittable / 2;

    return {
      resultA: { totalPaid: totalA, shouldPay, balance: totalA - shouldPay },
      resultB: { totalPaid: totalB, shouldPay, balance: totalB - shouldPay },
      total
    };
  }, [expenses, members]);

  const { leftMember, rightMember } = useMemo(() => {
    if (members.length < 2) return { leftMember: null, rightMember: null };
    const mA = members.find(m => m.role === 'A')!;
    const mB = members.find(m => m.role === 'B')!;
    if (mA.gender === 'M' && mB.gender === 'F') return { leftMember: mA, rightMember: mB };
    if (mA.gender === 'F' && mB.gender === 'M') return { leftMember: mB, rightMember: mA };
    return { leftMember: mA, rightMember: mB };
  }, [members]);

  const x = useMotionValue(0);

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 50;
    if (info.offset.x > threshold && activeScreen > 0) setActiveScreen(activeScreen - 1);
    else if (info.offset.x < -threshold && activeScreen < 2) setActiveScreen(activeScreen + 1);
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>;
  if (!user) return <AuthForm />;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white font-sans text-slate-900">
      <Header />

      <div className="fixed top-4 right-4 z-[60] flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="bg-slate-100"><Settings size={18} /></Button>
        <Button variant="ghost" size="icon" onClick={signOut} className="bg-slate-100 text-rose-500"><LogOut size={18} /></Button>
      </div>

      <div className="h-full w-full overflow-hidden">
        <motion.div
          className="flex h-full"
          style={{ width: '300%', x }}
          animate={{ x: `-${(activeScreen * 100) / 3}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
        >
          {leftMember && (
            <div className="h-full w-1/3 overflow-y-auto">
              <MemberSummary member={leftMember} result={leftMember.role === 'A' ? splitResult.resultA : splitResult.resultB} splitPercentage={50} expenses={expenses} members={members} onAddExpense={addExpense} onUpdateExpense={updateExpense} />
            </div>
          )}

          <div className="h-full w-1/3 overflow-y-auto px-6 pt-24 pb-32">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Despesas</h2>
              <div className="mt-2 flex items-center justify-between rounded-3xl bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Bruto</p>
                  <p className="text-2xl font-bold">{formatCurrency(splitResult.total)}</p>
                </div>
                <div className="h-10 w-[1px] bg-slate-800" />
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo Geral</p>
                  <p className={`text-xl font-bold ${splitResult.resultA.balance > 0 ? 'text-emerald-400' : splitResult.resultA.balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {formatCurrency(Math.abs(splitResult.resultA.balance))}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500">
                    {splitResult.resultA.balance > 0 ? `${members.find(m => m.role === 'A')?.nickname} recebe` : splitResult.resultA.balance < 0 ? `${members.find(m => m.role === 'A')?.nickname} deve` : 'Tudo certo!'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Histórico</h3>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`h-1.5 w-1.5 rounded-full ${activeScreen === i ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>

            <ExpenseList expenses={expenses} onDeleteExpense={deleteExpense} members={members} />
          </div>

          {rightMember && (
            <div className="h-full w-1/3 overflow-y-auto">
              <MemberSummary member={rightMember} result={rightMember.role === 'A' ? splitResult.resultA : splitResult.resultB} splitPercentage={50} expenses={expenses} members={members} onAddExpense={addExpense} onUpdateExpense={updateExpense} />
            </div>
          )}
        </motion.div>
      </div>

      <ExpenseForm onAddExpense={addExpense} members={members} />

      {/* Navigation Buttons ... (Skipped for brevity, same as before) */}
      <div className="fixed inset-x-0 bottom-8 z-40 flex items-center justify-center gap-8 px-6 pointer-events-none">
        <Button variant="secondary" size="icon" onClick={() => setActiveScreen(s => Math.max(0, s-1))} className={`bg-white shadow-lg pointer-events-auto ${activeScreen === 0 ? 'opacity-0' : ''}`}><ChevronLeft size={24} /></Button>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${activeScreen === i ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>
        <Button variant="secondary" size="icon" onClick={() => setActiveScreen(s => Math.min(2, s+1))} className={`bg-white shadow-lg pointer-events-auto ${activeScreen === 2 ? 'opacity-0' : ''}`}><ChevronRight size={24} /></Button>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} members={members} onUpdateMember={updateMember} />
    </div>
  );
};

export default App;
