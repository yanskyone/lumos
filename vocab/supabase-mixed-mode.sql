-- 支持混合模式（公共/私有错题）
-- 修改 vocab_errors 表

-- 1. 添加 share_type 字段（public = 公共，private = 私有）
ALTER TABLE vocab_errors ADD COLUMN IF NOT EXISTS share_type TEXT DEFAULT 'private';

-- 2. 添加 owner_id 字段（记录创建者）
ALTER TABLE vocab_errors ADD COLUMN IF NOT EXISTS owner_id TEXT;

-- 3. 将现有的 user_id 迁移到 owner_id（如果 owner_id 为空）
UPDATE vocab_errors SET owner_id = user_id WHERE owner_id IS NULL;

-- 4. 创建复合索引（用于按可见性查询）
DROP INDEX IF EXISTS idx_errors_share_type;
CREATE INDEX idx_errors_share_type ON vocab_errors(share_type);

DROP INDEX IF EXISTS idx_errors_owner;
CREATE INDEX idx_errors_owner ON vocab_errors(owner_id);

DROP INDEX IF EXISTS idx_errors_public;
CREATE INDEX idx_errors_public ON vocab_errors(share_type) WHERE share_type = 'public';

-- 5. 更新 RLS 策略支持混合模式
DROP POLICY IF EXISTS "Allow all for errors user" ON vocab_errors;
CREATE POLICY "Allow all for mixed mode" ON vocab_errors FOR ALL USING (true);

-- 6. 添加注释
COMMENT ON COLUMN vocab_errors.share_type IS 'public: 公共错题，所有用户可见; private: 私有错题，仅创建者可见';
COMMENT ON COLUMN vocab_errors.owner_id IS '错题创建者ID';

-- 7. 确认
SELECT
  'share_type column added' as step1,
  'owner_id column added' as step2,
  (SELECT COUNT(*) FROM vocab_errors WHERE share_type = 'public') as public_count,
  (SELECT COUNT(*) FROM vocab_errors WHERE share_type = 'private') as private_count;
