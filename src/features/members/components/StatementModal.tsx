import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { StatementMovementItem } from './StatementMovementItem';
import { formatCurrency } from '../../../utils/formatters';

interface StatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  movements: any[];
  consolidatedBalance: number;
  isZero: boolean;
  isPositive: boolean;
}

export const StatementModal: React.FC<StatementModalProps> = ({
  isOpen,
  onClose,
  member,
  movements,
  consolidatedBalance,
  isZero,
  isPositive,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Extrato Detalhado"
      maxWidth="md:w-[500px]"
    >
      <div className="flex flex-col h-full">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 -mt-4 mb-6">
          Movimentações de {member.nickname}
        </p>

        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar min-h-[40vh]">
          {movements.length === 0 ? (
            <div className="py-20 text-center">
              <AlertCircle size={40} className="mx-auto mb-4 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">Nenhuma movimentação registrada.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {movements.map((move, idx) => {
                const dateString = move.date.includes('T') ? move.date : `${move.date}T00:00:00-03:00`;
                const dateObj = new Date(dateString);
                const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }).format(dateObj);

                return (
                  <StatementMovementItem
                    key={move.id}
                    move={move}
                    isLast={idx === movements.length - 1}
                    formattedDate={formattedDate}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 p-6 bg-slate-50 border-t border-slate-100 -mx-6 -mb-6 rounded-b-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo Final Consolidado</p>
              <p className={`text-2xl font-black ${isZero ? 'text-slate-900' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(Math.abs(consolidatedBalance))}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xs font-bold ${isZero ? 'text-slate-500' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isZero ? 'Tudo em dia' : isPositive ? 'Crédito' : 'Débito'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
