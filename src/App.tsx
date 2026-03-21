import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { Header } from './components/Header';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { MemberSummary } from './components/MemberSummary';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExpenses } from './hooks/useExpenses';
import { useMembers } from './hooks/useMembers';
import { SettingsModal } from './components/layout/SettingsModal';
import { formatCurrency } from './utils/formatters';
import { Button } from './components/ui/Button';

const App: React.FC = () => {
  const { expenses, addExpense, updateExpense, deleteExpense, calculateSplit } = useExpenses();
  const { members, updateMember } = useMembers();
  const [activeScreen, setActiveScreen] = useState<number>(1); // 0: Left, 1: Home, 2: Right
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Determine which member is on which side based on gender (Male=Left, Female=Right)
  const { leftMember, rightMember } = useMemo(() => {
    const mA = members[0];
    const mB = members[1];
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

  const getResultForMember = (id: string) => id === 'A' ? calculateSplit.resultA : calculateSplit.resultB;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white font-sans text-slate-900">
      <Header />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-4 right-4 z-[60] bg-slate-100"
      >
        <Settings size={18} />
      </Button>

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
          {/* Screen 0: Left Member Summary */}
          <div className="h-full w-1/3 overflow-y-auto">
            <MemberSummary member={leftMember} result={getResultForMember(leftMember.id)} splitPercentage={50} expenses={expenses} members={members} onAddExpense={addExpense} onUpdateExpense={updateExpense} />
          </div>

          {/* Screen 1: Home (Expenses) */}
          <div className="h-full w-1/3 overflow-y-auto px-6 pt-24 pb-32">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Despesas</h2>
              <div className="mt-2 flex items-center justify-between rounded-3xl bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Acumulado</p>
                  <p className="text-2xl font-bold">{formatCurrency(calculateSplit.totalExpenses)}</p>
                </div>
                <div className="h-10 w-[1px] bg-slate-800" />
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo Pendente</p>
                  <p className={`text-xl font-bold ${calculateSplit.resultA.balance > 0 ? 'text-emerald-400' : calculateSplit.resultA.balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {formatCurrency(Math.abs(calculateSplit.resultA.balance))}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500">
                    {calculateSplit.resultA.balance > 0 ? `${members.find(m => m.id === 'A')?.nickname} recebe` : calculateSplit.resultA.balance < 0 ? `${members.find(m => m.id === 'A')?.nickname} deve` : 'Tudo certo!'}
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

          {/* Screen 2: Right Member Summary */}
          <div className="h-full w-1/3 overflow-y-auto">
            <MemberSummary member={rightMember} result={getResultForMember(rightMember.id)} splitPercentage={50} expenses={expenses} members={members} onAddExpense={addExpense} onUpdateExpense={updateExpense} />
          </div>
        </motion.div>
      </div>

      <ExpenseForm onAddExpense={addExpense} members={members} />

      {/* Swipe Nav (Desktop/Visual context) */}
      <div className="fixed inset-y-0 left-0 z-40 flex items-center pointer-events-none">
        <motion.button
          animate={{ x: activeScreen === 1 ? 0 : -20, opacity: activeScreen === 1 ? 1 : 0 }}
          onClick={() => setActiveScreen(0)}
          className={`flex h-24 w-10 items-center justify-center rounded-r-3xl backdrop-blur-sm pointer-events-auto border-y border-r ${leftMember.gender === 'M' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
        >
          <ChevronLeft size={28} />
        </motion.button>
      </div>

      <div className="fixed inset-y-0 right-0 z-40 flex items-center pointer-events-none">
        <motion.button
          animate={{ x: activeScreen === 1 ? 0 : 20, opacity: activeScreen === 1 ? 1 : 0 }}
          onClick={() => setActiveScreen(2)}
          className={`flex h-24 w-10 items-center justify-center rounded-l-3xl backdrop-blur-sm pointer-events-auto border-y border-l ${rightMember.gender === 'M' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
        >
          <ChevronRight size={28} />
        </motion.button>
      </div>

      {/* Pagination Markers */}
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
