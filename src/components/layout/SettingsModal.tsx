import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Member } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onUpdateMember: (id: string, field: keyof Member, value: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  members,
  onUpdateMember,
}) => {
  const [localMembers, setLocalMembers] = useState<Member[]>(members);

  useEffect(() => {
    if (isOpen) {
      setLocalMembers(members);
    }
  }, [isOpen, members]);

  const handleChange = (id: string, field: keyof Member, value: string) => {
    setLocalMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleBlur = (id: string, field: keyof Member, value: string) => {
    const original = members.find(m => m.id === id);
    if (original && original[field] !== value) {
      onUpdateMember(id, field, value);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
      <div className="space-y-8">
        <section>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Membros</h3>
          <div className="space-y-6">
            {localMembers.map((member) => (
              <div key={member.id} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{member.role === 'A' ? 'Membro A' : 'Membro B'}</p>
                <div className="space-y-3">
                  <Input
                    placeholder="Nome Completo"
                    value={member.fullName}
                    onChange={(e) => handleChange(member.id, 'fullName', e.target.value)}
                    onBlur={(e) => handleBlur(member.id, 'fullName', e.target.value)}
                  />
                  <Input
                    placeholder="Apelido"
                    value={member.nickname}
                    onChange={(e) => handleChange(member.id, 'nickname', e.target.value)}
                    onBlur={(e) => handleBlur(member.id, 'nickname', e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant={member.gender === 'M' ? 'primary' : 'ghost'}
                      className={`flex-1 ${member.gender === 'M' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white border border-slate-200 text-slate-400'}`}
                      onClick={() => {
                        handleChange(member.id, 'gender', 'M');
                        onUpdateMember(member.id, 'gender', 'M');
                      }}
                      size="sm"
                    >
                      Masculino
                    </Button>
                    <Button
                      variant={member.gender === 'F' ? 'primary' : 'ghost'}
                      className={`flex-1 ${member.gender === 'F' ? 'bg-red-500 hover:bg-red-600' : 'bg-white border border-slate-200 text-slate-400'}`}
                      onClick={() => {
                        handleChange(member.id, 'gender', 'F');
                        onUpdateMember(member.id, 'gender', 'F');
                      }}
                      size="sm"
                    >
                      Feminino
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Divisão</h3>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-600">
              A divisão de despesas está configurada como <span className="font-bold text-emerald-600">50/50</span>.
            </p>
          </div>
        </section>

        <Button className="w-full" onClick={onClose}>
          Concluído
        </Button>
      </div>
    </Modal>
  );
};
