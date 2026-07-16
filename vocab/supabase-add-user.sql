-- 添加用户追踪功能

-- 1. 为 vocab_training 表添加 user_id 列
ALTER TABLE vocab_training ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'anonymous';

-- 2. 为 vocab_errors 表添加 user_id 列（每个用户有自己的进度）
ALTER TABLE vocab_errors ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'default';

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_training_user ON vocab_training(user_id);
CREATE INDEX IF NOT EXISTS idx_errors_user ON vocab_errors(user_id);

-- 4. 更新 RLS 策略支持按用户查询
DROP POLICY IF EXISTS "Allow all for user tracking" ON vocab_training;
CREATE POLICY "Allow all for user tracking" ON vocab_training FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for errors user" ON vocab_errors;
CREATE POLICY "Allow all for errors user" ON vocab_errors FOR ALL USING (true);

-- 5. 确认
SELECT 'User tracking columns added' as status;
