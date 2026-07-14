-- 1. Add preference columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS allow_others_to_add BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_expense_approval BOOLEAN DEFAULT true;

-- 2. Create ENUM for expense approval status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_approval_status') THEN
        CREATE TYPE public.expense_approval_status AS ENUM ('approved', 'pending', 'rejected');
    END IF;
END$$;

-- 3. Add approval_status column to expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS approval_status public.expense_approval_status DEFAULT 'approved';

-- 4. Update RLS on users to allow updating these new preferences
-- (Existing policy "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id) already covers this)

-- 5. We need to allow users to INSERT expenses even if payer_id != auth.uid()
-- Let's check existing RLS on expenses:
-- There is no explicit INSERT policy in the current schema snapshot except maybe default?
-- Actually, let's just make sure users can insert expenses in rooms they belong to.
DROP POLICY IF EXISTS "Users can insert expenses" ON public.expenses;
CREATE POLICY "Users can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    public.is_room_member(room_id)
    -- We will validate payer_id permissions in the server action
  );

-- We also need users to be able to UPDATE expenses (e.g. to approve/reject them if they are the payer_id)
DROP POLICY IF EXISTS "Users can update expenses" ON public.expenses;
CREATE POLICY "Users can update expenses" ON public.expenses
  FOR UPDATE USING (
    -- User can update if they created it OR if they are the payer (for approving/rejecting)
    auth.uid() = created_by OR auth.uid() = payer_id
  );
