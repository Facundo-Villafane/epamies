-- Fix for text_submissions table user_id type mismatch
-- Run these commands in your Supabase SQL Editor

-- Step 1: View the existing policy to understand it
SELECT * FROM pg_policies WHERE tablename = 'text_submissions';

-- Step 2: Drop the RLS policy that depends on user_id
-- (Replace 'policy_name' with the actual policy name from Step 1)
-- Common policy names might be: "Users can insert their own text submissions"
-- or "Enable insert for users based on user_id"
DROP POLICY IF EXISTS "Users can insert their own text submissions" ON text_submissions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON text_submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON text_submissions;
DROP POLICY IF EXISTS "Users can read own submissions" ON text_submissions;

-- Step 3: Now we can alter the column type
ALTER TABLE text_submissions
ALTER COLUMN user_id TYPE TEXT;

-- Step 4: Recreate the RLS policies with TEXT type
-- Policy for INSERT
CREATE POLICY "Users can insert their own text submissions"
ON text_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = user_id);

-- Policy for UPDATE (users can update their own submissions)
CREATE POLICY "Users can update own submissions"
ON text_submissions
FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = user_id)
WITH CHECK (auth.jwt() ->> 'email' = user_id);

-- Policy for SELECT (users can read their own submissions)
CREATE POLICY "Users can read own submissions"
ON text_submissions
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = user_id);

-- Step 5: Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'text_submissions' AND column_name = 'user_id';

-- Step 6: Check that policies are recreated
SELECT * FROM pg_policies WHERE tablename = 'text_submissions';
