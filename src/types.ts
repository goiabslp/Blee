export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'fixa' | 'compras' | 'assinaturas';
  payerId?: string; // 'A' or 'B', optional for 'fixa'
  paymentMethod?: 'vista' | 'parcelado'; // optional for 'fixa'
  paymentType?: 'dinheiro' | 'cartao'; // Dinheiro or Cartão
  installments?: number;
  installmentDay?: number; // Day of the month for installments (1-31)
  installmentStartMonth?: string; // YYYY-MM of the first installment
  installmentNumber?: number; // Which installment is this (1, 2, 3...)
  dueDate?: string; // for 'fixa'
  isRecurring?: boolean; // if true, this is a template for monthly generation
  recurringDay?: number; // Day of the month (1-31)
  generatedFromId?: string; // if this is an instance generated from a template
  status?: 'paga' | 'pendente'; // Status of the expense
}

export interface Member {
  id: string; // 'A' or 'B'
  fullName: string;
  nickname: string;
  gender: 'M' | 'F';
}

export interface SplitResult {
  totalPaid: number;
  shouldPay: number;
  balance: number; // positive means they should receive, negative means they should pay
}
