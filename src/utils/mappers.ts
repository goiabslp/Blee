import { Member, Expense } from '../types';

export const mapMemberToDb = (member: Partial<Member>) => ({
  id: member.id,
  user_id: member.user_id,
  role: member.role,
  full_name: member.fullName,
  nickname: member.nickname,
  gender: member.gender,
});

export const mapMemberFromDb = (dbMember: any): Member => ({
  id: dbMember.id,
  user_id: dbMember.user_id,
  role: dbMember.role,
  fullName: dbMember.full_name,
  nickname: dbMember.nickname,
  gender: dbMember.gender,
});

export const mapExpenseToDb = (expense: Partial<Expense>) => ({
  id: expense.id,
  user_id: expense.user_id,
  description: expense.description,
  amount: expense.amount,
  date: expense.date,
  type: expense.type,
  payer_id: expense.payerId,
  payment_method: expense.paymentMethod,
  payment_type: expense.paymentType,
  installments: expense.installments,
  installment_day: expense.installmentDay,
  installment_start_month: expense.installmentStartMonth,
  installment_number: expense.installmentNumber,
  is_recurring: expense.isRecurring,
  recurring_day: expense.recurringDay,
  status_a: expense.statusA,
  status_b: expense.statusB,
  parent_id: expense.generatedFromId,
});

export const mapExpenseFromDb = (dbExpense: any): Expense => ({
  id: dbExpense.id,
  user_id: dbExpense.user_id,
  description: dbExpense.description,
  amount: Number(dbExpense.amount),
  date: dbExpense.date,
  type: dbExpense.type,
  payerId: dbExpense.payer_id,
  paymentMethod: dbExpense.payment_method,
  paymentType: dbExpense.payment_type,
  installments: dbExpense.installments,
  installmentDay: dbExpense.installment_day,
  installmentStartMonth: dbExpense.installment_start_month,
  installmentNumber: dbExpense.installment_number,
  isRecurring: dbExpense.is_recurring,
  recurringDay: dbExpense.recurring_day,
  statusA: dbExpense.status_a,
  statusB: dbExpense.status_b,
  generatedFromId: dbExpense.parent_id,
  created_at: dbExpense.created_at,
});
