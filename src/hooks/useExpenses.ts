import { useState, useEffect, useCallback, useMemo } from 'react';
import { Expense } from '../types';
import { supabase } from '../lib/supabase';
import { mapExpenseFromDb, mapExpenseToDb } from '../utils/mappers';

export const useExpenses = (userId: string | undefined, userGroupId: string | undefined) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!userId || !userGroupId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // RLS handles the filtering automatically
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
    } else if (data) {
      setExpenses(data.map(mapExpenseFromDb));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (newExpense: Omit<Expense, 'id'>) => {
    if (!userId || !userGroupId) return;
    const expenseToInsert = mapExpenseToDb({ ...newExpense, userGroupId } as any);
    delete (expenseToInsert as any).id;

    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseToInsert)
      .select()
      .single();

    if (error) {
      console.error('Error adding expense:', error);
    } else if (data) {
      setExpenses(prev => [mapExpenseFromDb(data), ...prev]);
    }
  };

  const updateExpense = async (updatedExpense: Expense) => {
    const { error } = await supabase
      .from('expenses')
      .update(mapExpenseToDb(updatedExpense))
      .eq('id', updatedExpense.id);

    if (error) {
      console.error('Error updating expense:', error);
    } else {
      setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
    }
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  // Logic for automatic generation of fixed and installment expenses
  useEffect(() => {
    if (!userId || !userGroupId || expenses.length === 0) return;

    const generateMissingEntries = async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const templates = expenses.filter(e => e.isRecurring && !e.generatedFromId);
      const toInsert: any[] = [];

      for (const template of templates) {
        const hasEntryForCurrentMonth = expenses.some(e => {
          const eDate = new Date(e.date);
          const isInstance = e.generatedFromId === template.id;
          const isTemplateItself = e.id === template.id;
          const sameMonthYear = (eDate.getMonth() + 1 === currentMonth) && (eDate.getFullYear() === currentYear);
          return (isInstance || isTemplateItself) && sameMonthYear;
        });

        if (!hasEntryForCurrentMonth) {
          if (template.type === 'fixa' && template.recurringDay) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(template.recurringDay).padStart(2, '0')}T12:00:00Z`;
            toInsert.push(mapExpenseToDb({
              ...template,
              userGroupId,
              date: dateStr,
              dueDate: dateStr,
              isRecurring: false,
              generatedFromId: template.id,
            } as any));
          } else if (template.paymentMethod === 'parcelado' && template.installmentDay && template.installmentStartMonth && template.installments) {
            const [startYear, startMonth] = template.installmentStartMonth.split('-').map(Number);
            const monthsDiff = (currentYear - startYear) * 12 + (currentMonth - startMonth);
            const installmentNum = monthsDiff + 1;

            if (installmentNum >= 1 && installmentNum <= template.installments) {
              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(template.installmentDay).padStart(2, '0')}T12:00:00Z`;
              toInsert.push(mapExpenseToDb({
                ...template,
                userGroupId,
                amount: template.amount / template.installments,
                date: dateStr,
                dueDate: dateStr,
                isRecurring: false,
                generatedFromId: template.id,
                installmentNumber: installmentNum,
              } as any));
            }
          }
        }
      }

      if (toInsert.length > 0) {
        const sanitized = toInsert.map(item => {
          const { id, ...rest } = item;
          return rest;
        });

        const { data, error } = await supabase
          .from('expenses')
          .insert(sanitized)
          .select();

        if (error) console.error('Error generating recurring expenses:', error);
        else if (data) setExpenses(prev => [...data.map(mapExpenseFromDb), ...prev]);
      }
    };

    generateMissingEntries();
  }, [expenses, userId]);

  const calculateSplit = useMemo(() => {
    const activeExpenses = expenses.filter(e => !e.isRecurring || e.generatedFromId);
    return { activeExpenses, totalExpenses: activeExpenses.reduce((acc, curr) => acc + curr.amount, 0) };
  }, [expenses]);

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    calculateSplit,
    loading
  };
};
