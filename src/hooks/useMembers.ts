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
    
    // Fetch members for this user's group (handled automatically by Supabase RLS)
    let { data, error } = await supabase
      .from('members')
      .select('*')
      .order('role', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
    } else if (data) {
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
