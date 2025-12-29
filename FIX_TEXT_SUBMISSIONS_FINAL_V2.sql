-- Fix for text_submissions table user_id type mismatch
-- This version drops ALL policies dynamically before altering the column

-- ============================================================
-- STEP 1: Drop ALL policies on text_submissions (dynamic)
-- ============================================================
-- First, let's see what policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'text_submissions';

-- Drop each policy one by one
-- Copy the policy names from the result above and drop them manually, or use this approach:

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
-- STEP 2: Alter the column type from UUID to TEXT
-- ============================================================
ALTER TABLE text_submissions
ALTER COLUMN user_id TYPE TEXT;

-- ============================================================
-- STEP 3: Create simplified RLS policies (INSERT and SELECT only)
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
-- STEP 4: Verify the changes
-- ============================================================

-- Check column type has changed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'text_submissions' AND column_name = 'user_id';

-- Check policies are recreated (should show only INSERT and SELECT)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'text_submissions';

-- ============================================================
-- DONE! Text submissions are now insert-only
-- ============================================================
-- Users can submit text once per category
-- No updates allowed (simplified)
