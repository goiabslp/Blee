import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Expense } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface PendingEditModalProps {
  expense: Expense | null;
  onApprove: (expense: Expense) => void;
  onReject: (expenseId: string) => void;
  oppositeName: string;
}

export const PendingEditModal: React.FC<PendingEditModalProps> = ({
  expense,
  onApprove,
  onReject,
  oppositeName
}) => {
  if (!expense || !expense.pendingEditData) return null;

  const oldData = expense;
  const newData = expense.pendingEditData;

  const hasChanged = (key: keyof Expense) => newData[key] !== undefined && newData[key] !== oldData[key];

  const renderField = (label: string, key: keyof Expense, formatFn?: (val: any) => string) => {
    if (!hasChanged(key)) return null;
    
    const oldVal = formatFn ? formatFn(oldData[key]) : oldData[key];
    const newVal = formatFn ? formatFn(newData[key]) : newData[key];

    return (
      <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-rose-500 line-through">{String(oldVal || 'N/A')}</span>
          <ArrowRight size={14} className="text-slate-300" />
          <span className="text-sm font-bold text-emerald-600">{String(newVal || 'N/A')}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-amber-500 p-6 text-white text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black tracking-tight">Edição Pendente</h2>
          <p className="mt-2 text-sm font-medium text-amber-100">
            {oppositeName} alterou esta despesa. Por favor, revise as mudanças.
          </p>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">{oldData.description}</h3>
            <p className="text-xs font-medium text-slate-500">Criada em {formatDate(oldData.date)}</p>
          </div>

          <div className="space-y-2 mb-8 max-h-[40vh] overflow-y-auto pr-2">
            {renderField('Descrição', 'description')}
            {renderField('Valor', 'amount', (val) => formatCurrency(Number(val)))}
            {renderField('Data', 'date', (val) => formatDate(String(val)))}
            {renderField('Categoria', 'type')}
            {renderField('Forma de Pagamento', 'paymentMethod')}
            {renderField('Método', 'paymentType')}
            {renderField('Parcelas', 'installments')}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => onReject(expense.id)}
              className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border-none"
            >
              <XCircle size={18} className="mr-2" />
              Recusar
            </Button>
            <Button
              onClick={() => onApprove(expense)}
              variant="success"
              className="flex-1"
            >
              <CheckCircle size={18} className="mr-2" />
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
