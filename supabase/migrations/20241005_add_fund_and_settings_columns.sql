-- 1. Add detailed weekly fixed cost columns to weekly_settlements
ALTER TABLE public.weekly_settlements
ADD COLUMN IF NOT EXISTS bank_loan_weekly bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS parking_weekly bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserve_weekly bigint DEFAULT 0;

-- 2. Add is_fund_spent column to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS is_fund_spent boolean DEFAULT false;

-- 3. Add maintenance settings columns to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS maintenance_interval_weeks integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS maintenance_min_fund bigint DEFAULT 2000000;
