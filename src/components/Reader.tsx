import React from 'react';

interface ReaderProps {
  label: string;
  value: string | number;
  type?: 'currency' | 'text' | 'date';
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export const Reader: React.FC<ReaderProps> = ({
  label,
  value,
  type = 'text',
  className = '',
  labelClassName = '',
  valueClassName = '',
}) => {
  const formatValue = () => {
    if (type === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(value));
    }
    if (type === 'date') {
      return new Date(value).toLocaleDateString('pt-BR');
    }
    return value;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <span className={`text-xs font-medium uppercase tracking-wider text-slate-500 ${labelClassName}`}>
        {label}
      </span>
      <span className={`text-lg font-semibold text-slate-900 ${valueClassName}`}>
        {formatValue()}
      </span>
    </div>
  );
};
