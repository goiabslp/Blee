export interface Expense {
  id: string;
  user_id?: string;
  description: string;
  amount: number;
  date: string;
  type: 'fixa' | 'compras' | 'assinaturas';
  payerId?: string; // UUID from members table
  paymentMethod?: 'vista' | 'parcelado';
  paymentType?: 'dinheiro' | 'cartao';
  installments?: number;
  installmentDay?: number;
  installmentStartMonth?: string;
  installmentNumber?: number;
  dueDate?: string;
  isRecurring?: boolean;
  recurringDay?: number;
  generatedFromId?: string;
  statusA?: 'paga' | 'pendente';
  statusB?: 'paga' | 'pendente';
  status?: 'paga' | 'pendente'; 
  created_at?: string;
}

export interface Member {
  id: string; // UUID
  user_id: string;
  role: 'A' | 'B';
  fullName: string;
  nickname: string;
  gender: 'M' | 'F';
}

export interface SplitResult {
  totalPaid: number;
  shouldPay: number;
  balance: number; // positive means they should receive, negative means they should pay
}
