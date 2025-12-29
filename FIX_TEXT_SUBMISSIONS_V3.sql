-- Fix for text_submissions table user_id type mismatch
-- Run these commands in your Supabase SQL Editor
-- IMPORTANT: Run these in order, one section at a time

-- ============================================================
-- STEP 1: Check current policies (informational only)
-- ============================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'text_submissions';

-- ============================================================
-- STEP 2: Drop all existing RLS policies on text_submissions
-- ============================================================
-- Note: This temporarily removes access controls, so do this during low-traffic time
DROP POLICY IF EXISTS "Users can insert their own text submissions" ON text_submissions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON text_submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON text_submissions;
DROP POLICY IF EXISTS "Users can read own submissions" ON text_submissions;
DROP POLICY IF EXISTS "Enable read access for own submissions" ON text_submissions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON text_submissions;

-- ============================================================
-- STEP 3: Alter the column type from UUID to TEXT
-- ============================================================
ALTER TABLE text_submissions
ALTER COLUMN user_id TYPE TEXT;

-- ============================================================
-- STEP 4: Recreate RLS policies for email-based authentication
-- ============================================================

-- Allow users to insert their own text submissions (using email)
CREATE POLICY "Users can insert their own text submissions"
ON text_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.email()
);

-- Allow users to update only their own submissions
CREATE POLICY "Users can update own submissions"
ON text_submissions
FOR UPDATE
TO authenticated
USING (user_id = auth.email())
WITH CHECK (user_id = auth.email());

-- Allow users to read only their own submissions
CREATE POLICY "Users can read own submissions"
ON text_submissions
FOR SELECT
TO authenticated
USING (user_id = auth.email());

-- ============================================================
-- STEP 5: Verify the changes
-- ============================================================

-- Check column type has changed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'text_submissions' AND column_name = 'user_id';

-- Check policies are recreated
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'text_submissions';

-- ============================================================
-- DONE! Your text_submissions table is now ready
-- ============================================================
-- The user_id column now accepts email addresses (TEXT)
-- Users can only insert, update, and read their own submissions
