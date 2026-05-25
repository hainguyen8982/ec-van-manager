-- 1. Policies for settings table
CREATE POLICY "Allow authenticated users to read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow owner to update settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
);

-- 2. Policies for transactions table
CREATE POLICY "Allow authenticated users to perform all operations on transactions"
ON public.transactions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Policies for weekly_settlements table
CREATE POLICY "Allow authenticated users to perform all operations on weekly_settlements"
ON public.weekly_settlements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
