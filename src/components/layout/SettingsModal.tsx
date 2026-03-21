import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Member } from '../../types';
import { supabase } from '../../lib/supabase';
import { Copy, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalMembers(members);
      setInviteCode(null);
      setInviteError(null);
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

  const generateInvite = async () => {
    setIsGeneratingInvite(true);
    setInviteError(null);
    try {
      const userGroupId = members[0]?.userGroupId;
      if (!userGroupId) throw new Error("Grupo não encontrado.");
      
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      
      const { error } = await supabase.from('invites').insert({
        code,
        user_group_id: userGroupId,
        status: 'pending'
      });
      
      if (error) throw error;
      setInviteCode(code);
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const copyInvite = () => {
    const link = `${window.location.origin}/#invite/${inviteCode}`;
    navigator.clipboard.writeText(`Participe da minha conta Blee!\n\nUse o link: ${link}\nOu clique em 'Entrar com Convite' e digite o código: ${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Membros da Conta</h3>
            {members.length < 2 && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">Falta 1 membro</span>
            )}
          </div>

          <div className="space-y-6">
            <AnimatePresence>
              {localMembers.map((member) => (
                <motion.div 
                  key={member.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                  className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{member.role === 'A' ? 'Membro Principal' : 'Parceiro(a)'}</p>
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
                        variant={member.gender === 'M' ? 'primary' : 'secondary'}
                        className={`flex-1 ${member.gender === 'M' ? 'bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-400'}`}
                        onClick={() => {
                          handleChange(member.id, 'gender', 'M');
                          onUpdateMember(member.id, 'gender', 'M');
                        }}
                        size="sm"
                      >
                        Masculino
                      </Button>
                      <Button
                        variant={member.gender === 'F' ? 'primary' : 'secondary'}
                        className={`flex-1 ${member.gender === 'F' ? 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20' : 'bg-white border border-slate-200 text-slate-400'}`}
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
                </motion.div>
              ))}
            </AnimatePresence>

            {members.length === 1 && !inviteCode && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2">
                <Button 
                  onClick={generateInvite} 
                  isLoading={isGeneratingInvite}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 gap-2 h-12"
                >
                  <UserPlus size={18} />
                  Convidar Parceiro(a)
                </Button>
              </motion.div>
            )}

            {inviteError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100">
                <AlertCircle size={14} />
                {inviteError}
              </div>
            )}

            {inviteCode && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center space-y-4"
              >
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Código de Convite</p>
                  <p className="text-4xl font-black tracking-[0.2em] text-emerald-700">{inviteCode}</p>
                </div>
                
                <p className="text-xs font-medium text-emerald-600/80">
                  Envie este código ou o link abaixo para o seu parceiro(a) acessar e se cadastrar.
                </p>

                <Button 
                  onClick={copyInvite} 
                  variant="secondary"
                  className="w-full bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100 gap-2 h-12"
                >
                  {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                  {copied ? 'Copiado!' : 'Copiar Convite'}
                </Button>
              </motion.div>
            )}

          </div>
        </section>

        <section>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Divisão</h3>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-sm font-medium text-slate-600">
              A divisão de despesas está configurada como <span className="font-bold text-emerald-600">50/50</span>.
            </p>
          </div>
        </section>
      </div>
    </Modal>
  );
};
