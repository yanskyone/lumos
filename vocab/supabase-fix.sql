-- 修复脚本：处理已存在的对象

-- 删除现有政策（如果存在）
DROP POLICY IF EXISTS "Allow all on vocab_errors" ON vocab_errors;
DROP POLICY IF EXISTS "Allow all on vocab_training" ON vocab_training;
DROP POLICY IF EXISTS "Allow all on vocab_batches" ON vocab_batches;

-- 重新创建政策
CREATE POLICY "Allow all on vocab_errors" ON vocab_errors FOR ALL USING (true);
CREATE POLICY "Allow all on vocab_training" ON vocab_training FOR ALL USING (true);
CREATE POLICY "Allow all on vocab_batches" ON vocab_batches FOR ALL USING (true);

-- 确认
SELECT 'RLS policies recreated' as status;
