export interface Expense {
  id: string;
  userGroupId?: string;
  description: string;
  amount: number;
  date: string;
  type: 'fixa' | 'compras' | 'assinaturas' | 'eventual';
  payerId?: string; // UUID from members table
  paymentMethod?: 'vista' | 'parcelado' | 'eventual';
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
  pendingEditData?: Partial<Expense>;
  pendingEditBy?: string;
  cardOwner?: string;
}

export interface Member {
  id: string; // UUID
  userGroupId?: string;
  authUserId?: string;
  role: 'A' | 'B';
  fullName: string;
  nickname: string;
  username: string;
  gender: 'M' | 'F';
  birthDate?: string;
  email?: string;
  phone?: string;
}

export interface Invite {
  id: string;
  code: string;
  userGroupId: string;
  status: 'pending' | 'used';
  createdAt?: string;
}

export interface SplitResult {
  totalPaid: number;
  shouldPay: number;
  balance: number; // positive means they should receive, negative means they should pay
}
