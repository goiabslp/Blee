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
  }, [userId, userGroupId]);

  useEffect(() => {
    fetchExpenses();

    if (!userGroupId) return;

    const channel = supabase
      .channel(`expenses_changes_${userGroupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (payload.new.user_group_id !== userGroupId) return;
            setExpenses(prev => {
              if (prev.some(e => e.id === payload.new.id)) return prev;
              return [mapExpenseFromDb(payload.new), ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            });
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.user_group_id !== userGroupId) return;
            setExpenses(prev => {
              const updated = prev.map(e => e.id === payload.new.id ? mapExpenseFromDb(payload.new) : e);
              return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            });
          } else if (payload.eventType === 'DELETE') {
            setExpenses(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchExpenses, userGroupId]);

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
    if (updatedExpense.id.startsWith('virtual-')) {
      const expenseToInsert = mapExpenseToDb(updatedExpense);
      // Remove the virtual ID so the database can generate a real UUID
      delete (expenseToInsert as any).id;

      const { data, error } = await supabase
        .from('expenses')
        .insert(expenseToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error persisting virtual expense:', error);
      } else if (data) {
        setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? mapExpenseFromDb(data) : e));
      }
      return;
    }

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
    if (id.startsWith('virtual-')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      return;
    }

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

  const proposeExpenseEdit = async (originalId: string, editedData: Partial<Expense>) => {
    if (!userId) return;

    if (originalId.startsWith('virtual-')) {
      const virtualExpense = expenses.find(e => e.id === originalId);
      if (!virtualExpense) return;

      const expenseToInsert = mapExpenseToDb({
        ...virtualExpense,
        pendingEditData: editedData as Expense,
        pendingEditBy: userId,
      });
      delete (expenseToInsert as any).id;

      const { data, error } = await supabase
        .from('expenses')
        .insert(expenseToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error proposing edit on virtual expense:', error);
      } else if (data) {
        setExpenses(prev => prev.map(e => e.id === originalId ? mapExpenseFromDb(data) : e));
      }
      return;
    }

    const { error } = await supabase
      .from('expenses')
      .update({
        pending_edit_data: mapExpenseToDb(editedData),
        pending_edit_by: userId,
      })
      .eq('id', originalId);

    if (error) console.error('Error proposing edit:', error);
  };

  const approveExpenseEdit = async (expense: Expense) => {
    if (!expense.pendingEditData) return;
    
    const updatedExpense = {
      ...expense,
      ...expense.pendingEditData,
    };

    const { error } = await supabase
      .from('expenses')
      .update({
        ...mapExpenseToDb(updatedExpense),
        pending_edit_data: null,
        pending_edit_by: null,
      })
      .eq('id', expense.id);

    if (error) console.error('Error approving edit:', error);
  };

  const rejectExpenseEdit = async (expenseId: string) => {
    const { error } = await supabase
      .from('expenses')
      .update({
        pending_edit_data: null,
        pending_edit_by: null,
      })
      .eq('id', expenseId);

    if (error) console.error('Error rejecting edit:', error);
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
          } else if (template.paymentMethod === 'parcelado' && template.installmentDay && template.installments) {
            const purchaseDate = new Date(template.date);
            const startYearMonth = purchaseDate.getFullYear() * 12 + purchaseDate.getMonth();
            const currentYearMonth = currentYear * 12 + (currentMonth - 1);
            const monthsDiff = currentYearMonth - startYearMonth;
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
    proposeExpenseEdit,
    approveExpenseEdit,
    rejectExpenseEdit,
    calculateSplit,
    loading
  };
};
