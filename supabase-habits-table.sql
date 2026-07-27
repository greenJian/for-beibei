-- 创建"知你"习惯记录表
CREATE TABLE IF NOT EXISTS beibei_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '其他',
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 允许公开访问（与现有表策略一致）
ALTER TABLE beibei_habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON beibei_habits;
CREATE POLICY "Allow all access" ON beibei_habits FOR ALL USING (true) WITH CHECK (true);
