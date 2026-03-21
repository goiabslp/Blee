import { Member } from '../types';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_MEMBERS: Member[] = [
  { id: 'A', fullName: 'Membro A', nickname: 'Membro A', gender: 'M' },
  { id: 'B', fullName: 'Membro B', nickname: 'Membro B', gender: 'F' },
];

export const useMembers = () => {
  const [members, setMembers] = useLocalStorage<Member[]>('members', DEFAULT_MEMBERS);

  const updateMember = (id: string, field: keyof Member, value: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const getMemberById = (id: string) => members.find(m => m.id === id);

  return {
    members,
    updateMember,
    getMemberById,
  };
};
