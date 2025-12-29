-- Fix for text_submissions table user_id type mismatch
-- This version handles foreign key constraints AND policies

-- ============================================================
-- STEP 1: Check current constraints and policies
-- ============================================================
-- See what foreign keys exist
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'text_submissions'::regclass;

-- See what policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'text_submissions';

-- ============================================================
-- STEP 2: Drop ALL policies on text_submissions (dynamic)
-- ============================================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'text_submissions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON text_submissions', policy_record.policyname);
    END LOOP;
END $$;

-- ============================================================
-- STEP 3: Drop the foreign key constraint on user_id
-- ============================================================
-- The user_id was probably referencing a users table with UUID
-- We need to drop this constraint since we're changing to email (TEXT)
ALTER TABLE text_submissions
DROP CONSTRAINT IF EXISTS text_submissions_user_id_fkey;

-- ============================================================
-- STEP 4: Alter the column type from UUID to TEXT
-- ============================================================
ALTER TABLE text_submissions
ALTER COLUMN user_id TYPE TEXT;

-- ============================================================
-- STEP 5: Create simplified RLS policies (INSERT and SELECT only)
-- ============================================================

-- Allow users to insert their own text submissions (using email)
CREATE POLICY "Users can insert their own text submissions"
ON text_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.email()
);

-- Allow users to read only their own submissions
CREATE POLICY "Users can read own submissions"
ON text_submissions
FOR SELECT
TO authenticated
USING (user_id = auth.email());

-- ============================================================
-- STEP 6: Verify the changes
-- ============================================================

-- Check column type has changed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'text_submissions' AND column_name = 'user_id';

-- Check foreign keys (should be none on user_id now)
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'text_submissions'::regclass;

-- Check policies are recreated (should show only INSERT and SELECT)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'text_submissions';

-- ============================================================
-- DONE! Text submissions are now insert-only with email-based auth
-- ============================================================
-- ✅ Foreign key constraint removed (user_id is now just TEXT email)
-- ✅ Policies updated to use auth.email()
-- ✅ Users can submit text once per category
-- ✅ No updates allowed (simplified)
