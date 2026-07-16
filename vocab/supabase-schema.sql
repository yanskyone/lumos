-- Supabase SQL Schema for Lumos Vocab
-- 运行此脚本在 Supabase SQL Editor 中创建表

-- 1. 错题表
CREATE TABLE IF NOT EXISTS vocab_errors (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT NOT NULL,
    category TEXT DEFAULT 'unlearned',
    wrong_answer TEXT,
    error_note TEXT,
    tip TEXT,
    unit TEXT,
    status TEXT DEFAULT 'pending',
    mastered_modes TEXT[] DEFAULT '{}',
    confused_with TEXT[] DEFAULT '{}',
    correct_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_practiced_at TIMESTAMPTZ,
    batch_id TEXT
);

-- 2. 训练记录表
CREATE TABLE IF NOT EXISTS vocab_training (
    id TEXT PRIMARY KEY,
    error_id TEXT,
    mode TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    is_correct BOOLEAN,
    response_time INTEGER DEFAULT 0
);

-- 3. 批次表
CREATE TABLE IF NOT EXISTS vocab_batches (
    id TEXT PRIMARY KEY,
    source TEXT,
    total_imported INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 设置 RLS (Row Level Security) - 允许多人使用同一项目
ALTER TABLE vocab_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_batches ENABLE ROW LEVEL SECURITY;

-- 允许多有操作（个人项目，无需认证）
CREATE POLICY "Allow all on vocab_errors" ON vocab_errors FOR ALL USING (true);
CREATE POLICY "Allow all on vocab_training" ON vocab_training FOR ALL USING (true);
CREATE POLICY "Allow all on vocab_batches" ON vocab_batches FOR ALL USING (true);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_errors_word ON vocab_errors(word);
CREATE INDEX IF NOT EXISTS idx_errors_status ON vocab_errors(status);
CREATE INDEX IF NOT EXISTS idx_training_date ON vocab_training(date);
