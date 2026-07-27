-- 改造 province_memories 表：去掉唯一约束 + 新增城市、日期字段
ALTER TABLE province_memories DROP CONSTRAINT IF EXISTS province_memories_province_name_key;

ALTER TABLE province_memories ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE province_memories ADD COLUMN IF NOT EXISTS visit_date DATE;
