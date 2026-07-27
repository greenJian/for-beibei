-- ============================================
-- 用户认证系统 + 信件表升级
-- 执行方式：在 Supabase SQL Editor 中粘贴全部执行
-- ============================================

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS site_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  avatar_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 预置两个账号
-- greenjian / 密码: love
INSERT INTO site_users (username, password_hash, display_name, gender)
VALUES ('greenjian', '686f746a95b6f836d7d70567c302c3f9ebb5ee0def3d1220ee9d4e9f34f5e131', '小汪', 'male')
ON CONFLICT (username) DO NOTHING;

-- beibei / 密码: love
INSERT INTO site_users (username, password_hash, display_name, gender)
VALUES ('beibei', '686f746a95b6f836d7d70567c302c3f9ebb5ee0def3d1220ee9d4e9f34f5e131', '小丁', 'female')
ON CONFLICT (username) DO NOTHING;

-- 3. 信件表添加作者字段（关联用户）
ALTER TABLE letters ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES site_users(id);

-- 4. 允许公开访问（与现有表策略一致）
ALTER TABLE site_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON site_users;
CREATE POLICY "Allow all access" ON site_users FOR ALL USING (true) WITH CHECK (true);
