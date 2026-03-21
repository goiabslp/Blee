import React, { useState, useMemo } from 'react';
import { motion, useMotionValue } from 'motion/react';
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

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { members, updateMember, loading: membersLoading } = useMembers(user?.id);
  
  const userGroupId = members[0]?.userGroupId;
  const { expenses, addExpense, updateExpense, deleteExpense, calculateSplit, loading: expensesLoading } = useExpenses(user?.id, userGroupId);
  
  const [activeScreen, setActiveScreen] = useState<number>(1);
  const isTransitioning = React.useRef(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 700 : false);
  const [isTinyMobile, setIsTinyMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 500 : false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 700);
      setIsTinyMobile(window.innerWidth < 500);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Derived state for split calculation
  const splitResult = useMemo(() => {
    if (!members.length || !expenses.length) return { resultA: { balance: 0, totalPaid: 0, shouldPay: 0 }, resultB: { balance: 0, totalPaid: 0, shouldPay: 0 }, total: 0 };
    
    const memA = members.find(m => m.role === 'A');
    const memB = members.find(m => m.role === 'B');
    if (!memA || !memB) return { resultA: { balance: 0, totalPaid: 0, shouldPay: 0 }, resultB: { balance: 0, totalPaid: 0, shouldPay: 0 }, total: 0 };

    // In this new model, we only count 'vista' (cash) expenses that are 'paga'
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

  const handleDragEnd = (_: any, info: any) => {
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
          drag={isMobile ? "x" : false}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          onAnimationComplete={handleAnimationComplete}
          whileDrag={{ opacity: 0.8 }}
        >
          <div className="h-full w-1/3 overflow-y-auto bg-slate-50/50">
            {leftMember ? (
              <MemberSummary member={leftMember} result={leftMember.role === 'A' ? splitResult.resultA : splitResult.resultB} splitPercentage={50} expenses={expenses} members={members} onAddExpense={addExpense} onUpdateExpense={updateExpense} />
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

          <div className="h-full w-1/3 overflow-y-auto bg-slate-50/50">
            {rightMember ? (
              <MemberSummary member={rightMember} result={rightMember.role === 'A' ? splitResult.resultA : splitResult.resultB} splitPercentage={50} expenses={expenses} members={members} onAddExpense={addExpense} onUpdateExpense={updateExpense} />
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

      {!isMobile && <ExpenseForm onAddExpense={addExpense} members={members} />}

      {/* Navigation Buttons ... (Skipped for brevity, same as before) */}
      {!isTinyMobile && (
        <div className="fixed inset-x-0 bottom-8 z-40 flex items-center justify-center gap-8 px-6 pointer-events-none">
          <Button variant="secondary" size="icon" onClick={() => {
            if (!isTransitioning.current && activeScreen > 0) {
              isTransitioning.current = true;
              setActiveScreen(activeScreen - 1);
            }
          }} className={`bg-white shadow-lg pointer-events-auto ${activeScreen === 0 ? 'opacity-0' : ''}`}><ChevronLeft size={24} /></Button>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${activeScreen === i ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>
          <Button variant="secondary" size="icon" onClick={() => {
            if (!isTransitioning.current && activeScreen < 2) {
              isTransitioning.current = true;
              setActiveScreen(activeScreen + 1);
            }
          }} className={`bg-white shadow-lg pointer-events-auto ${activeScreen === 2 ? 'opacity-0' : ''}`}><ChevronRight size={24} /></Button>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} members={members} onUpdateMember={updateMember} />
    </div>
  );
};

export default App;
