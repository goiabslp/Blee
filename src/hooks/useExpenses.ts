import { useState, useEffect, useMemo } from 'react';
import { Expense, SplitResult } from '../types';
import { useLocalStorage } from './useLocalStorage';

export const useExpenses = () => {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);

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

  // Logic for automatic generation of fixed and installment expenses
  useEffect(() => {
    if (expenses.length === 0) return;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const templates = expenses.filter(e => e.isRecurring && !e.generatedFromId);
    const generatedEntries: Expense[] = [];

    templates.forEach(template => {
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

  const calculateSplit = useMemo(() => {
    const effectiveSplit = 50;
    const activeExpenses = expenses.filter(e => !e.isRecurring || e.generatedFromId);

    const totalA = activeExpenses
      .filter((e) => e.payerId === 'A')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalB = activeExpenses
      .filter((e) => e.payerId === 'B')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const sharedExpenses = activeExpenses
      .filter((e) => !e.payerId)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpenses = totalA + totalB + sharedExpenses;
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

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    calculateSplit,
  };
};
