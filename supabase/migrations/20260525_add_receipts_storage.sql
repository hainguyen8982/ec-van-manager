-- 1. Thêm cột receipt_url vào bảng transactions để lưu link ảnh hóa đơn
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_url text;

-- 2. Tạo Storage Bucket tên là 'receipts' (nếu chưa có)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Cấp quyền truy cập công khai cho bucket 'receipts'
-- Cho phép bất kỳ ai đọc file (để hiển thị ảnh trên web)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');

-- Cho phép upload file vào bucket
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');

-- Cho phép update file
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts');

-- Cho phép xóa file
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');
