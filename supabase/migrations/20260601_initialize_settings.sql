-- 1. Cho phép owner thêm mới cấu hình (nếu chưa có)
CREATE POLICY "Allow owner to insert settings"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
);

-- 2. Thêm dòng cấu hình mặc định ban đầu nếu bảng settings đang trống
INSERT INTO public.settings (
  bank_loan_monthly,
  is_bank_loan_active,
  parking_monthly,
  is_parking_active,
  reserve_monthly,
  is_reserve_active,
  driver_ratio,
  maintenance_interval_weeks,
  maintenance_min_fund,
  revenue_sources,
  expense_categories,
  updated_at
)
SELECT
  0,
  true,
  0,
  true,
  0,
  true,
  50,
  12,
  2000000,
  '[{"id": "grab", "name": "Grab", "color": "#00b14f"}, {"id": "ahamove", "name": "Ahamove", "color": "#ff6b00"}, {"id": "lalamove", "name": "Lalamove", "color": "#ff8b00"}]'::jsonb,
  '[{"id": "charge", "name": "Sạc pin", "icon": "⚡", "isFundEligible": false}, {"id": "toll", "name": "Cầu đường", "icon": "🛣️", "isFundEligible": false}, {"id": "parking", "name": "Gửi xe", "icon": "🅿️", "isFundEligible": false}, {"id": "repair", "name": "Sửa chữa", "icon": "🔧", "isFundEligible": true}, {"id": "bank", "name": "Ngân hàng", "icon": "🏦", "isFundEligible": true}]'::jsonb,
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.settings);
