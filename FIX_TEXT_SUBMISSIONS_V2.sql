-- Fix for text_submissions table user_id type mismatch
-- Run these commands in your Supabase SQL Editor
-- IMPORTANT: Run these in order, one at a time

-- ============================================================
-- STEP 1: Check current policies (informational only)
-- ============================================================
SELECT polname, pg_get_policydef(oid)
FROM pg_policy
WHERE polrelid = 'text_submissions'::regclass;

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
  user_id = (SELECT auth.email())
);

-- Allow users to update only their own submissions
CREATE POLICY "Users can update own submissions"
ON text_submissions
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.email()))
WITH CHECK (user_id = (SELECT auth.email()));

-- Allow users to read only their own submissions
CREATE POLICY "Users can read own submissions"
ON text_submissions
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.email()));

-- ============================================================
-- STEP 5: Verify the changes
-- ============================================================

-- Check column type has changed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'text_submissions' AND column_name = 'user_id';

-- Check policies are recreated
SELECT polname, pg_get_policydef(oid)
FROM pg_policy
WHERE polrelid = 'text_submissions'::regclass;

-- ============================================================
-- STEP 6: Test with a sample query (optional)
-- ============================================================
-- This should work now without UUID errors
-- SELECT * FROM text_submissions WHERE user_id = 'test@example.com';
