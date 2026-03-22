import React from 'react';
import { Clock, CreditCard, Tag } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { formatCurrency, formatDate } from '../../../utils/formatters';

interface PaymentGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any | null;
  themeBg: string;
  themeShadow: string;
}

export const PaymentGroupModal: React.FC<PaymentGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  themeBg,
  themeShadow,
}) => {
  if (!group) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vencimento" position="bottom">
      <div className="space-y-6">
        <p className="text-sm font-medium text-slate-500 -mt-4 mb-4">
          {formatDate(group.date)}
        </p>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total a Pagar (Sua Parte)</p>
          <p className="text-2xl font-black text-emerald-700">{formatCurrency(group.total / 2)}</p>
        </div>

        <div>
          <h5 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Despesas ({group.items.length})</h5>
          <div className="space-y-3">
            {group.items.map((item: any, idx: number) => {
              const isInstallment = (item.expense.paymentMethod === 'parcelado' || item.expense.installmentNumber) && item.expense.installments && item.expense.installments > 1;
              const isFixed = item.expense.type === 'fixa';
              
              return (
                <div key={idx} className="flex flex-col gap-2 rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${isFixed ? 'bg-blue-50 text-blue-500' : isInstallment ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {isFixed ? <Clock size={12} /> : isInstallment ? <CreditCard size={12} /> : <Tag size={12} />}
                      </div>
                      <p className={`text-sm font-bold ${item.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {item.description}
                      </p>
                    </div>
                    {item.isPaid && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700">PAGO</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pl-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium text-slate-400">
                        {item.installmentInfo || (isFixed ? 'Mensal' : 'À Vista')}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${isInstallment ? 'text-indigo-500' : 'text-emerald-500'}`}>
                        {isInstallment ? 'Sua Parcela' : 'Sua Cota'}
                      </p>
                      <p className={`text-sm font-black mt-0.5 ${item.isPaid ? 'text-slate-400' : 'text-slate-900'}`}>
                        {formatCurrency((isInstallment ? item.expense.amount / (item.expense.installments || 1) : item.expense.amount) / 2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={onClose} className={`w-full ${themeBg} ${themeShadow}`}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
};
