-- ============================================
-- 混合模式迁移脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- Step 1: 添加 share_type 字段
ALTER TABLE vocab_errors ADD COLUMN IF NOT EXISTS share_type TEXT DEFAULT 'private';

-- Step 2: 添加 owner_id 字段
ALTER TABLE vocab_errors ADD COLUMN IF NOT EXISTS owner_id TEXT;

-- Step 3: 迁移现有数据（把 user_id 复制到 owner_id）
UPDATE vocab_errors SET owner_id = user_id WHERE owner_id IS NULL;

-- Step 4: 创建索引
CREATE INDEX IF NOT EXISTS idx_errors_share_type ON vocab_errors(share_type);
CREATE INDEX IF NOT EXISTS idx_errors_owner ON vocab_errors(owner_id);
CREATE INDEX IF NOT EXISTS idx_errors_public ON vocab_errors(share_type) WHERE share_type = 'public';

-- Step 5: 更新 RLS 策略
DROP POLICY IF EXISTS "Allow all for errors user" ON vocab_errors;
CREATE POLICY "Allow all for mixed mode" ON vocab_errors FOR ALL USING (true);

-- Step 6: 验证结果
SELECT
  'share_type 列' as 字段,
  data_type as 类型,
  column_default as 默认值
FROM information_schema.columns
WHERE table_name = 'vocab_errors'
AND column_name = 'share_type'

UNION ALL

SELECT
  'owner_id 列',
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'vocab_errors'
AND column_name = 'owner_id'

UNION ALL

SELECT
  'user_id 列',
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'vocab_errors'
AND column_name = 'user_id';

-- 数据统计
SELECT
  share_type,
  COUNT(*) as 数量
FROM vocab_errors
GROUP BY share_type;
