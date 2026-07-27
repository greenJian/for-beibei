-- 省份记忆表：存储每个省份的照片和故事
CREATE TABLE IF NOT EXISTS province_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    province_name TEXT NOT NULL UNIQUE,
    story TEXT DEFAULT '',
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 行级安全策略
ALTER TABLE province_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON province_memories FOR ALL USING (true) WITH CHECK (true);
