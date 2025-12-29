-- Fix for text_submissions table user_id type mismatch
-- Simplified version: users can only INSERT and SELECT, no UPDATE needed
-- Run these commands in your Supabase SQL Editor

-- ============================================================
-- STEP 1: Drop ALL existing RLS policies on text_submissions
-- ============================================================
DROP POLICY IF EXISTS "Users can insert their own text submissions" ON text_submissions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON text_submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON text_submissions;
DROP POLICY IF EXISTS "Users can read own submissions" ON text_submissions;
DROP POLICY IF EXISTS "Enable read access for own submissions" ON text_submissions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON text_submissions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON text_submissions;

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
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'text_submissions';

-- ============================================================
-- DONE! Text submissions are now insert-only
-- ============================================================
-- Users can submit text once per category
-- No updates allowed (simplified)
