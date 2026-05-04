-- Re-enable RLS with proper policies (run after testing)
-- This creates policies that work with Firebase Auth

-- Users table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert during signup (before auth context)
CREATE POLICY "Allow signup" ON users FOR INSERT WITH CHECK (true);

-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON users
FOR SELECT USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow users to update their own data
CREATE POLICY "Users can update own data" ON users
FOR UPDATE USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Freelancers table policies
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Freelancers can view own data" ON freelancers
FOR SELECT USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Freelancers can insert own data" ON freelancers FOR INSERT WITH CHECK (true);
CREATE POLICY "Freelancers can update own data" ON freelancers
FOR UPDATE USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Jobs table policies (public read for open jobs)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view open jobs" ON jobs FOR SELECT USING (status = 'open');
CREATE POLICY "Customers can manage own jobs" ON jobs
FOR ALL USING (customer_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Add similar policies for other tables as needed
