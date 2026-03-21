import { useState, useEffect, useCallback } from 'react';
import { Member } from '../types';
import { supabase } from '../lib/supabase';
import { mapMemberFromDb, mapMemberToDb } from '../utils/mappers';

export const useMembers = (userId: string | undefined) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    
    // Fetch members for this user
    let { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .order('role', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      setLoading(false);
      return;
    }

    // If no members, create default A and B
    if (!data || data.length === 0) {
      const defaultMembers = [
        { user_id: userId, role: 'A', full_name: 'Membro A', nickname: 'Membro A', gender: 'M' },
        { user_id: userId, role: 'B', full_name: 'Membro B', nickname: 'Membro B', gender: 'F' },
      ];
      
      const { data: newData, error: insertError } = await supabase
        .from('members')
        .insert(defaultMembers)
        .select();

      if (insertError) {
        console.error('Error creating default members:', insertError);
      } else {
        data = newData;
      }
    }

    if (data) {
      setMembers(data.map(mapMemberFromDb));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateMember = async (id: string, field: keyof Member, value: any) => {
    const member = members.find(m => m.id === id);
    if (!member) return;

    const updatedMember = { ...member, [field]: value };
    const { error } = await supabase
      .from('members')
      .update(mapMemberToDb(updatedMember))
      .eq('id', id);

    if (error) {
      console.error('Error updating member:', error);
    } else {
      setMembers(prev => prev.map(m => m.id === id ? updatedMember : m));
    }
  };

  return { members, updateMember, loading };
};
