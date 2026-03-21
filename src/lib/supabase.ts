import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxlxeqptetlwtnsyuvsn.supabase.co';
const supabaseAnonKey = 'sb_publishable_iVdyaHMVCecjcMJUZ2Y_kA_u4LKYLwD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
