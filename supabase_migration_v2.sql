-- Reset Blee Database for Multi-User Group Architecture

-- 1. Drop existing tables
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS user_groups CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Create User Groups
CREATE TABLE user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create Members
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_group_id uuid REFERENCES user_groups(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('A', 'B')),
  full_name text NOT NULL,
  nickname text NOT NULL,
  username text UNIQUE NOT NULL,
  gender text CHECK (gender IN ('M', 'F')),
  birth_date date,
  email text,
  phone text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Create Invites
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  user_group_id uuid REFERENCES user_groups(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'used')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Create Expenses
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_group_id uuid REFERENCES user_groups(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL,
  date timestamp with time zone NOT NULL,
  type text NOT NULL,
  payer_id uuid REFERENCES members(id),
  payment_method text,
  payment_type text,
  installments integer,
  installment_day integer,
  installment_start_month text,
  installment_number integer,
  is_recurring boolean DEFAULT false,
  recurring_day integer,
  status_a text DEFAULT 'pendente',
  status_b text DEFAULT 'pendente',
  parent_id uuid REFERENCES expenses(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Helper Function for RLS
CREATE OR REPLACE FUNCTION get_user_group_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT user_group_id INTO v_group_id
  FROM members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN v_group_id;
END;
$$;

-- 7. RLS Policies
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow users to create groups initially
CREATE POLICY "Users can create groups" ON user_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view their own groups" ON user_groups FOR SELECT TO authenticated USING (id = get_user_group_id());

-- Allow initial member creation
CREATE POLICY "Users can view members in their group" ON members FOR SELECT TO authenticated USING (user_group_id = get_user_group_id());
CREATE POLICY "Users can insert members" ON members FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid() OR user_group_id = get_user_group_id());
CREATE POLICY "Users can update members in their group" ON members FOR UPDATE TO authenticated USING (user_group_id = get_user_group_id() OR auth_user_id = auth.uid());

CREATE POLICY "Users can view invites in their group or pending ones" ON invites FOR SELECT TO authenticated USING (user_group_id = get_user_group_id() OR status = 'pending');
CREATE POLICY "Users can create invites for their group" ON invites FOR INSERT TO authenticated WITH CHECK (user_group_id = get_user_group_id());
CREATE POLICY "Users can update invites" ON invites FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can view expenses in their group" ON expenses FOR SELECT TO authenticated USING (user_group_id = get_user_group_id());
CREATE POLICY "Users can insert expenses in their group" ON expenses FOR INSERT TO authenticated WITH CHECK (user_group_id = get_user_group_id());
CREATE POLICY "Users can update expenses in their group" ON expenses FOR UPDATE TO authenticated USING (user_group_id = get_user_group_id());
CREATE POLICY "Users can delete expenses in their group" ON expenses FOR DELETE TO authenticated USING (user_group_id = get_user_group_id());

-- 8. Explicit Grants for public
GRANT ALL ON TABLE user_groups TO anon, authenticated;
GRANT ALL ON TABLE members TO anon, authenticated;
GRANT ALL ON TABLE invites TO anon, authenticated;
GRANT ALL ON TABLE expenses TO anon, authenticated;

-- 9. RPC for Username Login
-- Allows the frontend to lookup an email by username without being authenticated
CREATE OR REPLACE FUNCTION get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as database owner
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM members
  WHERE username = p_username
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_username TO anon, authenticated;
