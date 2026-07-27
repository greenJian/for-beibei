-- ============================================
-- 头像功能升级 — 在 Supabase SQL Editor 一次性执行
-- ============================================

-- ① 给用户表添加头像字段
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ② 创建 avatars 存储桶（如果还没有的话）
-- 控制台操作：Storage → New Bucket → 名称: avatars → 勾选 Public → Create
-- 然后在当前 SQL Editor 执行下面的策略：

-- ③ 存储桶访问策略
-- 允许所有人上传头像
CREATE POLICY "Allow avatar uploads for all"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'avatars');

-- 允许所有人读取头像
CREATE POLICY "Allow avatar reads for all"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');
