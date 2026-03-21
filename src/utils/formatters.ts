export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getNextPaymentDate = (day: number): Date => {
  const now = new Date();
  const nextDate = new Date(now.getFullYear(), now.getMonth(), day);
  if (nextDate < now) {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }
  return nextDate;
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(d);
};
