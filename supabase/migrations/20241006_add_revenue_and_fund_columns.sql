-- 1. Add revenue_sources JSON and default_fund_deduction to settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS revenue_sources jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_fund_deduction bigint NOT NULL DEFAULT 0;

-- 2. Add fund_deduction and fund_deduction_note to weekly_settlements
ALTER TABLE public.weekly_settlements
  ADD COLUMN IF NOT EXISTS fund_deduction bigint,
  ADD COLUMN IF NOT EXISTS fund_deduction_note text;
