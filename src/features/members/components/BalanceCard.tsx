import React from 'react';
import { motion } from 'motion/react';
import { Wallet, TrendingUp, TrendingDown, Receipt, CheckCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/formatters';

interface BalanceCardProps {
  balance: number;
  oppositeName: string;
  onOpenStatement: () => void;
  onZeroDebt: () => void;
  themeBg: string;
  themeShadow: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  oppositeName,
  onOpenStatement,
  onZeroDebt,
  themeBg,
  themeShadow,
}) => {
  const isZero = Math.abs(balance) < 0.01;
  const isPositive = balance > 0;

  return (
    <Card className="flex flex-col justify-between h-full" padding="lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo Atual Consolidado</p>
          <p className={`text-3xl font-black ${isZero ? 'text-slate-600' : isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(Math.abs(balance))}
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isZero ? 'bg-slate-50 text-slate-400' : isPositive ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
          {isZero ? <Wallet size={24} /> : isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isZero ? 'bg-slate-300' : isPositive ? 'bg-emerald-500' : 'bg-rose-500'} ${!isZero && 'animate-pulse'}`} />
          <p className="text-xs font-bold text-slate-600">
            {isZero 
              ? "Tudo certo por aqui, ninguém deve nada a ninguém" 
              : isPositive 
                ? `${oppositeName} te deve o valor acima` 
                : `Você deve pagar o valor acima para ${oppositeName}`}
          </p>
        </div>
        
        <div className="mt-4 flex gap-2">
          <Button
            onClick={onOpenStatement}
            className={`flex-1 ${themeBg} ${themeShadow}`}
            size="sm"
          >
            <Receipt size={14} className="mr-2" />
            Extrato
          </Button>
          <Button
            onClick={onZeroDebt}
            disabled={balance <= 0}
            variant={balance > 0 ? 'secondary' : 'ghost'}
            className={`flex-1 ${balance > 0 ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}`}
            size="sm"
          >
            <CheckCircle size={14} className="mr-2" />
            Zerar Dívida
          </Button>
        </div>
      </div>
    </Card>
  );
};
