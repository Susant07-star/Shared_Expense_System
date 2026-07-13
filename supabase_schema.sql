-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create tables
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text)::varchar(8),
  require_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TYPE public.room_role AS ENUM ('admin', 'member');
CREATE TYPE public.member_status AS ENUM ('pending', 'active');

CREATE TABLE public.room_members (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role public.room_role DEFAULT 'member',
  status public.member_status DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

CREATE TYPE public.expense_type AS ENUM ('shared', 'personal');
CREATE TYPE public.expense_status AS ENUM ('paid', 'unpaid');

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.users(id), -- Nullable if unpaid
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  type public.expense_type NOT NULL DEFAULT 'shared',
  status public.expense_status NOT NULL DEFAULT 'paid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE -- For soft deletes
);

CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount_owed DECIMAL(10,2) NOT NULL
);

CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  payee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Setup trigger to create a user profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'New User'), new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can read all users (needed for roommate names), but only update their own
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Fix infinite recursion for room_members by using a Security Definer function
CREATE OR REPLACE FUNCTION public.is_room_member(check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.room_members WHERE room_id = check_room_id AND user_id = auth.uid() AND status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_any_room_member(check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.room_members WHERE room_id = check_room_id AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rooms: Users can read and update rooms they are members of
CREATE POLICY "Users can view rooms they belong to" ON public.rooms 
  FOR SELECT USING (public.is_any_room_member(id));
CREATE POLICY "Users can update rooms they belong to" ON public.rooms 
  FOR UPDATE USING (public.is_room_member(id));
CREATE POLICY "Admins can delete their rooms" ON public.rooms
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = id AND user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Authenticated users can create rooms" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Room Members: Users can view members of their rooms.
CREATE POLICY "Users can view members of their rooms" ON public.room_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_room_member(room_id)
  );
CREATE POLICY "Users can insert themselves into a room" ON public.room_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Expenses: Viewable and insertable by room members
CREATE POLICY "Room members can view expenses" ON public.expenses
  FOR SELECT USING (public.is_room_member(room_id));
CREATE POLICY "Room members can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (public.is_room_member(room_id));
CREATE POLICY "Room members can update expenses" ON public.expenses
  FOR UPDATE USING (public.is_room_member(room_id));

-- Expense Splits: Viewable by room members
CREATE POLICY "Room members can view splits" ON public.expense_splits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_splits.expense_id AND public.is_room_member(e.room_id))
  );
CREATE POLICY "Room members can insert splits" ON public.expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_splits.expense_id AND public.is_room_member(e.room_id))
  );
CREATE POLICY "Room members can update splits" ON public.expense_splits
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_splits.expense_id AND public.is_room_member(e.room_id))
  );

-- Settlements: Viewable and insertable by room members
CREATE POLICY "Room members can view settlements" ON public.settlements
  FOR SELECT USING (public.is_room_member(room_id));
CREATE POLICY "Room members can insert settlements" ON public.settlements
  FOR INSERT WITH CHECK (public.is_room_member(room_id));

-- Activity Logs: Viewable and insertable by room members
CREATE POLICY "Room members can view activity logs" ON public.activity_logs
  FOR SELECT USING (public.is_room_member(room_id));
CREATE POLICY "Room members can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (public.is_room_member(room_id));

-- Enable Realtime
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_splits;
alter publication supabase_realtime add table public.settlements;
alter publication supabase_realtime add table public.activity_logs;

-- 4. RPC Functions for Room Management
-- This function allows securely finding a room by its invite code, bypassing RLS on the rooms table
CREATE OR REPLACE FUNCTION public.get_room_by_invite_code(code TEXT)
RETURNS TABLE (id UUID, require_approval BOOLEAN) AS $$
BEGIN
  RETURN QUERY SELECT r.id, r.require_approval FROM public.rooms r WHERE r.invite_code = code LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
