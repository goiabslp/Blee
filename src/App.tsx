import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Header } from './components/Header';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { MemberSummary } from './components/MemberSummary';
import { Expense, Member, SplitResult } from './types';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeScreen, setActiveScreen] = useState<number>(1); // 0: Left Member, 1: Home, 2: Right Member
  const [splitPercentage, setSplitPercentage] = useState<number>(50); // Member A percentage
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([
    { id: 'A', fullName: 'Membro A', nickname: 'Membro A', gender: 'M' },
    { id: 'B', fullName: 'Membro B', nickname: 'Membro B', gender: 'F' },
  ]);

  // Load data from localStorage
  useEffect(() => {
    const savedExpenses = localStorage.getItem('expenses');
    const savedSplit = localStorage.getItem('splitPercentage');
    const savedMembers = localStorage.getItem('members');
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedSplit) setSplitPercentage(Number(savedSplit));
    if (savedMembers) setMembers(JSON.parse(savedMembers));
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('splitPercentage', splitPercentage.toString());
  }, [splitPercentage]);

  useEffect(() => {
    localStorage.setItem('members', JSON.stringify(members));
  }, [members]);

  // Automatic generation of fixed and installment expenses
  useEffect(() => {
    if (expenses.length === 0) return;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const templates = expenses.filter(e => e.isRecurring && !e.generatedFromId);
    const generatedEntries: Expense[] = [];

    templates.forEach(template => {
      // Check if an entry for this template already exists for the current month/year
      const hasEntryForCurrentMonth = expenses.some(e => {
        const eDate = new Date(e.date);
        const isInstance = e.generatedFromId === template.id;
        const isTemplateItself = e.id === template.id;
        const sameMonthYear = (eDate.getMonth() + 1 === currentMonth) && (eDate.getFullYear() === currentYear);
        return (isInstance || isTemplateItself) && sameMonthYear;
      });

      if (!hasEntryForCurrentMonth) {
        if (template.type === 'fixa' && template.recurringDay) {
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(template.recurringDay).padStart(2, '0')}`;
          generatedEntries.push({
            ...template,
            id: Math.random().toString(36).substr(2, 9),
            date: dateStr,
            dueDate: dateStr,
            isRecurring: false,
            generatedFromId: template.id,
          });
        } else if (template.paymentMethod === 'parcelado' && template.installmentDay && template.installmentStartMonth && template.installments) {
          const [startYear, startMonth] = template.installmentStartMonth.split('-').map(Number);
          const monthsDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
          const installmentNum = monthsDiff + 1;

          if (installmentNum >= 1 && installmentNum <= template.installments) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(template.installmentDay).padStart(2, '0')}`;
            generatedEntries.push({
              ...template,
              id: Math.random().toString(36).substr(2, 9),
              amount: template.amount / template.installments,
              date: dateStr,
              dueDate: dateStr,
              isRecurring: false,
              generatedFromId: template.id,
              installmentNumber: installmentNum,
            });
          }
        }
      }
    });

    if (generatedEntries.length > 0) {
      setExpenses(prev => [...generatedEntries, ...prev]);
    }
  }, [expenses]);

  // Determine which member is on which side
  const { leftMember, rightMember } = useMemo(() => {
    const memberA = members.find(m => m.id === 'A')!;
    const memberB = members.find(m => m.id === 'B')!;

    // Rule: Male = Blue (Left), Female = Red (Right)
    if (memberA.gender === 'M' && memberB.gender === 'F') {
      return { leftMember: memberA, rightMember: memberB };
    }
    if (memberA.gender === 'F' && memberB.gender === 'M') {
      return { leftMember: memberB, rightMember: memberA };
    }
    // Default or same gender
    return { leftMember: memberA, rightMember: memberB };
  }, [members]);

  const addExpense = (newExpense: Omit<Expense, 'id'>) => {
    const expenseWithId: Expense = {
      ...newExpense,
      id: Math.random().toString(36).substr(2, 9),
    };
    setExpenses([expenseWithId, ...expenses]);
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses(expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e));
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const calculateSplit = useMemo(() => {
    // Force 50/50 split as per new business rules
    const effectiveSplit = 50;

    // Filter out templates (recurring expenses that are not instances)
    const activeExpenses = expenses.filter(e => !e.isRecurring || e.generatedFromId);

    const totalA = activeExpenses
      .filter((e) => e.payerId === 'A')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalB = activeExpenses
      .filter((e) => e.payerId === 'B')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // Expenses without payer (fixed expenses or generated installments) are considered shared
    const sharedExpenses = activeExpenses
      .filter((e) => !e.payerId)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpenses = totalA + totalB + sharedExpenses;

    // Only expenses with a specific payer are split for balance calculation
    const splittableTotal = totalA + totalB;
    const shouldPayA = (splittableTotal * effectiveSplit) / 100;
    const shouldPayB = (splittableTotal * (100 - effectiveSplit)) / 100;

    const resultA: SplitResult = {
      totalPaid: totalA,
      shouldPay: shouldPayA,
      balance: totalA - shouldPayA,
    };

    const resultB: SplitResult = {
      totalPaid: totalB,
      shouldPay: shouldPayB,
      balance: totalB - shouldPayB,
    };

    return { resultA, resultB, totalExpenses };
  }, [expenses]);

  const getResultForMember = (id: string) => {
    return id === 'A' ? calculateSplit.resultA : calculateSplit.resultB;
  };

  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ['#f8fafc', '#ffffff', '#f8fafc']
  );

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50;
    if (info.offset.x > threshold && activeScreen > 0) {
      setActiveScreen(activeScreen - 1);
    } else if (info.offset.x < -threshold && activeScreen < 2) {
      setActiveScreen(activeScreen + 1);
    }
  };

  const updateMember = (id: string, field: keyof Member, value: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white font-sans text-slate-900">
      <Header />

      {/* Settings Button */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-4 right-4 z-[60] flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
      >
        <Settings size={18} />
      </button>

      {/* Main Swipe Container */}
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
            <MemberSummary
              member={leftMember}
              result={getResultForMember(leftMember.id)}
              splitPercentage={50}
              expenses={expenses}
              members={members}
              onAddExpense={addExpense}
              onUpdateExpense={updateExpense}
            />
          </div>

          {/* Screen 1: Home (Expenses) */}
          <div className="h-full w-1/3 overflow-y-auto px-6 pt-24 pb-32">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Despesas</h2>
              <div className="mt-2 flex items-center justify-between rounded-3xl bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Acumulado</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateSplit.totalExpenses)}
                  </p>
                </div>
                <div className="h-10 w-[1px] bg-slate-800" />
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo Pendente</p>
                  <p className={`text-xl font-bold ${calculateSplit.resultA.balance > 0 ? 'text-emerald-400' : calculateSplit.resultA.balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(calculateSplit.resultA.balance))}
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
                <div className={`h-1.5 w-1.5 rounded-full ${activeScreen === 0 ? (leftMember.gender === 'M' ? 'bg-blue-500' : 'bg-red-500') : 'bg-slate-200'}`} />
                <div className={`h-1.5 w-1.5 rounded-full ${activeScreen === 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <div className={`h-1.5 w-1.5 rounded-full ${activeScreen === 2 ? (rightMember.gender === 'M' ? 'bg-blue-500' : 'bg-red-500') : 'bg-slate-200'}`} />
              </div>
            </div>

            <ExpenseList expenses={expenses} onDeleteExpense={deleteExpense} members={members} />
          </div>

          {/* Screen 2: Right Member Summary */}
          <div className="h-full w-1/3 overflow-y-auto">
            <MemberSummary
              member={rightMember}
              result={getResultForMember(rightMember.id)}
              splitPercentage={50}
              expenses={expenses}
              members={members}
              onAddExpense={addExpense}
              onUpdateExpense={updateExpense}
            />
          </div>
        </motion.div>
      </div>

      {/* Floating Action Button */}
      <ExpenseForm onAddExpense={addExpense} members={members} />

      {/* Side Navigation Buttons */}
      <div className="fixed inset-y-0 left-0 z-40 flex items-center pointer-events-none">
        <motion.button
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: activeScreen === 1 ? 0 : -20, opacity: activeScreen === 1 ? 1 : 0 }}
          whileHover={{ scale: 1.1, backgroundColor: leftMember.gender === 'M' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveScreen(0)}
          className={`flex h-24 w-10 items-center justify-center rounded-r-3xl backdrop-blur-sm pointer-events-auto shadow-sm border-y border-r ${
            leftMember.gender === 'M' 
              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}
        >
          <ChevronLeft size={28} />
        </motion.button>
      </div>

      <div className="fixed inset-y-0 right-0 z-40 flex items-center pointer-events-none">
        <motion.button
          initial={{ x: 10, opacity: 0 }}
          animate={{ x: activeScreen === 1 ? 0 : 20, opacity: activeScreen === 1 ? 1 : 0 }}
          whileHover={{ scale: 1.1, backgroundColor: rightMember.gender === 'M' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveScreen(2)}
          className={`flex h-24 w-10 items-center justify-center rounded-l-3xl backdrop-blur-sm pointer-events-auto shadow-sm border-y border-l ${
            rightMember.gender === 'M' 
              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}
        >
          <ChevronRight size={28} />
        </motion.button>
      </div>

      {/* Navigation Indicators */}
      <div className="fixed inset-x-0 bottom-8 z-40 flex items-center justify-center gap-8 px-6 pointer-events-none">
        <button 
          onClick={() => activeScreen > 0 && setActiveScreen(activeScreen - 1)}
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg pointer-events-auto transition-opacity ${activeScreen === 0 ? 'opacity-0' : 'opacity-100'}`}
        >
          <ChevronLeft size={24} className="text-slate-400" />
        </button>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${
                activeScreen === i 
                  ? (i === 0 ? (leftMember.gender === 'M' ? 'w-6 bg-blue-500' : 'w-6 bg-red-500') : i === 2 ? (rightMember.gender === 'M' ? 'w-6 bg-blue-500' : 'w-6 bg-red-500') : 'w-6 bg-emerald-500') 
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <button 
          onClick={() => activeScreen < 2 && setActiveScreen(activeScreen + 1)}
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg pointer-events-auto transition-opacity ${activeScreen === 2 ? 'opacity-0' : 'opacity-100'}`}
        >
          <ChevronRight size={24} className="text-slate-400" />
        </button>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-6 top-1/2 z-[80] -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:left-1/2 md:w-[450px] md:-translate-x-1/2"
            >
              <h2 className="mb-6 text-xl font-bold text-slate-900">Configurações</h2>
              
              <div className="space-y-8">
                <section>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Membros</h3>
                  <div className="space-y-6">
                    {members.map((member) => (
                      <div key={member.id} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Membro {member.id}</p>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Nome Completo"
                            value={member.fullName}
                            onChange={(e) => updateMember(member.id, 'fullName', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            placeholder="Apelido"
                            value={member.nickname}
                            onChange={(e) => updateMember(member.id, 'nickname', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm outline-none focus:border-emerald-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMember(member.id, 'gender', 'M')}
                              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                                member.gender === 'M' ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 border border-slate-200'
                              }`}
                            >
                              Masculino
                            </button>
                            <button
                              onClick={() => updateMember(member.id, 'gender', 'F')}
                              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                                member.gender === 'F' ? 'bg-red-500 text-white' : 'bg-white text-slate-400 border border-slate-200'
                              }`}
                            >
                              Feminino
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Divisão</h3>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-600">
                      A divisão de despesas está configurada como <span className="font-bold text-emerald-600">50/50</span>.
                    </p>
                  </div>
                </section>

                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20"
                >
                  Concluído
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
