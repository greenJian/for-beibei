-- ============================================================
-- For Beibei 数据隔离迁移脚本
-- 用途：为"知你"、"初时"、"时光信"三个表增加用户标识列
-- 执行位置：Supabase Dashboard → SQL Editor → New query → 粘贴执行
-- 重要说明：本项目使用自定义登录（site_users 表），没有使用 Supabase Auth，
--          因此 RLS（行级安全）策略基于 auth.uid() 不可用。
--          数据隔离目前通过前端代码按 user_id/author_id 过滤实现。
-- ============================================================

-- 1. 为 beibei_habits（知你）增加 user_id 列
--    如果 site_users.id 不是 uuid，请把 uuid 改成 text
ALTER TABLE public.beibei_habits
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2. 为 firsts（初时）增加 user_id 列
ALTER TABLE public.firsts
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- 3. 为 letters（时光信）增加 author_id 列（如果还没有）
ALTER TABLE public.letters
  ADD COLUMN IF NOT EXISTS author_id uuid;

-- 4. 创建索引，提高按用户查询速度
CREATE INDEX IF NOT EXISTS idx_beibei_habits_user_id ON public.beibei_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_firsts_user_id ON public.firsts(user_id);
CREATE INDEX IF NOT EXISTS idx_letters_author_id ON public.letters(author_id);
