-- 1. Thêm cột khoảng thời gian chốt sổ vào bảng weekly_settlements
ALTER TABLE public.weekly_settlements
ADD COLUMN IF NOT EXISTS start_date timestamptz,
ADD COLUMN IF NOT EXISTS end_date timestamptz;

-- 2. Đổi tên cột week_number và week_year thành nullable vì chúng ta sẽ dùng start_date và end_date
ALTER TABLE public.weekly_settlements
ALTER COLUMN week_number DROP NOT NULL,
ALTER COLUMN week_year DROP NOT NULL;

-- 3. Thêm cột settlement_id vào transactions để khóa các giao dịch đã được chốt
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS settlement_id uuid REFERENCES public.weekly_settlements(id) ON DELETE SET NULL;
