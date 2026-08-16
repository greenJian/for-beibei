-- ============================================================
-- For Beibei 数据隔离迁移脚本（合并版：加列 + 旧数据归属小汪）
-- 执行位置：Supabase Dashboard → SQL Editor → New query → 粘贴执行
-- 小汪 (greenjian) id: 7e719a93-3f27-4ffa-b5ce-5a7aeaa5a385
-- 小丁 (beibei)   id: 11d9fe8a-9916-441c-a2a9-7e57c3fac945
-- ============================================================

-- 1. 为 beibei_habits（知你）增加 user_id 列
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

-- 5. 旧数据全部归属到小汪账号（只填充空值，不覆盖已有归属）
UPDATE public.beibei_habits
  SET user_id = '7e719a93-3f27-4ffa-b5ce-5a7aeaa5a385'
  WHERE user_id IS NULL;

UPDATE public.firsts
  SET user_id = '7e719a93-3f27-4ffa-b5ce-5a7aeaa5a385'
  WHERE user_id IS NULL;

UPDATE public.letters
  SET author_id = '7e719a93-3f27-4ffa-b5ce-5a7aeaa5a385'
  WHERE author_id IS NULL;
