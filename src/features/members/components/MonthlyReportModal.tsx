import React from 'react';
import { FileText, Download, X, PieChart } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Expense, Member } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  members: Member[];
  selectedMonth: number;
  selectedYear: number;
}

const monthsList = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  expenses,
  members,
  selectedMonth,
  selectedYear,
}) => {
  const memberA = members.find(m => m.role === 'A');
  const memberB = members.find(m => m.role === 'B');

  const calculateMemberTotals = (member?: Member) => {
    if (!member) return { list: [], total: 0 };
    
    const list = expenses.map(e => {
      let tagLabel = '';
      let tagColor: [number, number, number] = [148, 163, 184]; // default slate-400
      const isInstallment = (e.paymentMethod === 'parcelado' || (e.installmentNumber && e.installmentNumber > 0));
      const isRecurring = e.isRecurring || e.type === 'fixa' || e.type === 'assinaturas';
      
      if (isInstallment) {
        tagLabel = `${e.installmentNumber || 1}/${e.installments || '?'} parcelas`;
        tagColor = [59, 130, 246]; // blue-500
      } else if (isRecurring) {
        tagLabel = 'Mensal';
        tagColor = [16, 185, 129]; // emerald-500
      } else {
        tagLabel = 'Pagamento Unico';
        tagColor = [139, 92, 246]; // purple-500
      }

      return {
        tag: tagLabel,
        tagColor,
        description: e.description,
        portion: e.amount / 2,
      };
    });
    
    const total = list.reduce((acc, curr) => acc + curr.portion, 0);
    return { list, total };
  };

  const reportA = calculateMemberTotals(memberA);
  const reportB = calculateMemberTotals(memberB);

  const downloadPdf = () => {
    const doc = new jsPDF();
    const monthName = monthsList[selectedMonth];
    const title = `Relatório de Despesas - ${monthName} de ${selectedYear}`;

    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Blee - Controle Financeiro', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(title, 14, 30);

    const tableDataA = reportA.list.map(item => ['', item.description, formatCurrency(item.portion)]);
    const tableDataB = reportB.list.map(item => ['', item.description, formatCurrency(item.portion)]);

    // Member A Table
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(`Participante: ${memberA?.nickname || 'Membro A'}`, 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Tipo', 'Descrição', 'Valor (50%)']],
      body: tableDataA,
      foot: [['', 'Total', formatCurrency(reportA.total)]],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // emerald-500
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 35 } },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 0) {
          const item = reportA.list[data.row.index];
          const [r, g, b] = item.tagColor;
          doc.setFillColor(r, g, b);
          const p = 1.5;
          (doc as any).roundedRect(data.cell.x + p, data.cell.y + p, data.cell.width - p * 2, data.cell.height - p * 2, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          (doc as any).text(item.tag, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      }
    });

    // Member B Table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setTextColor(30, 41, 59);
    doc.text(`Participante: ${memberB?.nickname || 'Membro B'}`, 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Tipo', 'Descrição', 'Valor (50%)']],
      body: tableDataB,
      foot: [['', 'Total', formatCurrency(reportB.total)]],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }, // blue-500
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 35 } },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 0) {
          const item = reportB.list[data.row.index];
          const [r, g, b] = item.tagColor;
          doc.setFillColor(r, g, b);
          const p = 1.5;
          (doc as any).roundedRect(data.cell.x + p, data.cell.y + p, data.cell.width - p * 2, data.cell.height - p * 2, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          (doc as any).text(item.tag, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      }
    });

    doc.save(`Relatorio_Blee_${monthName}_${selectedYear}.pdf`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Relatório Mensal" position="bottom">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Referência</p>
            <p className="text-lg font-bold">{monthsList[selectedMonth]} {selectedYear}</p>
          </div>
          <PieChart className="text-emerald-400" size={24} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Member A */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <h4 className="font-bold text-slate-900">{memberA?.nickname || 'Membro A'}</h4>
            </div>
            <div className="space-y-2">
              {reportA.list.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-50 border-dotted">
                  <span className="text-slate-500 truncate mr-4">
                    <span className="font-bold text-[9px] mr-1.5 text-slate-400">{item.tag}</span>
                    {item.description}
                  </span>
                  <span className="font-bold text-slate-700 shrink-0">{formatCurrency(item.portion)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-600">Total</span>
              <span className="font-black text-emerald-700">{formatCurrency(reportA.total)}</span>
            </div>
          </div>

          {/* Member B */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <h4 className="font-bold text-slate-900">{memberB?.nickname || 'Membro B'}</h4>
            </div>
            <div className="space-y-2">
              {reportB.list.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-50 border-dotted">
                  <span className="text-slate-500 truncate mr-4">
                    <span className="font-bold text-[9px] mr-1.5 text-slate-400">{item.tag}</span>
                    {item.description}
                  </span>
                  <span className="font-bold text-slate-700 shrink-0">{formatCurrency(item.portion)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-blue-600">Total</span>
              <span className="font-black text-blue-700">{formatCurrency(reportB.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <Button 
            onClick={downloadPdf}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
          >
            <Download size={18} className="mr-2" />
            Baixar PDF
          </Button>
          <Button onClick={onClose} variant="ghost" className="flex-1">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
