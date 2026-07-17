-- ============================================
-- 公共错题库独立表设计
-- 创建新表 vocab_public 用于存储公共错题
-- ============================================

-- Step 1: 创建公共错题表
CREATE TABLE IF NOT EXISTS vocab_public (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    phonetic TEXT DEFAULT '',
    meaning TEXT NOT NULL,
    category TEXT DEFAULT 'unlearned',
    wrong_answer TEXT DEFAULT '',
    error_note TEXT DEFAULT '',
    tip TEXT DEFAULT '',
    unit TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    mastered_modes TEXT[] DEFAULT '{}',
    confused_with TEXT[] DEFAULT '{}',
    correct_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_practiced_at TIMESTAMPTZ,
    -- 元数据
    source TEXT DEFAULT 'system',  -- 来源: system=系统, admin=管理员
    version INTEGER DEFAULT 1,       -- 版本号，便于更新
    is_active BOOLEAN DEFAULT true  -- 是否启用
);

-- Step 2: 创建索引
CREATE INDEX IF NOT EXISTS idx_public_word ON vocab_public(word);
CREATE INDEX IF NOT EXISTS idx_public_category ON vocab_public(category);
CREATE INDEX IF NOT EXISTS idx_public_status ON vocab_public(status);
CREATE INDEX IF NOT EXISTS idx_public_active ON vocab_public(is_active) WHERE is_active = true;

-- Step 3: RLS 策略（公共错题所有人可读）
ALTER TABLE vocab_public ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Public read all" ON vocab_public;
DROP POLICY IF EXISTS "Public write admin" ON vocab_public;

-- 所有人可读
CREATE POLICY "Public read all" ON vocab_public FOR SELECT USING (true);

-- 仅管理员可写（暂时允许所有，后续可限制）
CREATE POLICY "Public write all" ON vocab_public FOR ALL USING (true);

-- Step 4: 插入示例公共错题（50条）
INSERT INTO vocab_public (id, word, phonetic, meaning, category, wrong_answer, error_note, source) VALUES
('pub-001', 'Wednesday', 'ˈwenzdeɪ', '星期三', 'unlearned', 'wesneday', '漏字母 d', 'system'),
('pub-002', 'colourful', 'ˈkʌləf(ə)l', '丰富多彩的', 'unlearned', 'colorful', '英式美式拼写', 'system'),
('pub-003', 'beautiful', 'ˈbjuːtɪf(ə)l', '美丽的', 'unlearned', 'beautifull', '漏字母 e', 'system'),
('pub-004', 'restaurant', 'ˈrestrɒnt', '餐厅', 'unlearned', 'restrant', '少字母 au', 'system'),
('pub-005', 'comfortable', 'ˈkʌmftəb(ə)l', '舒适的', 'unlearned', 'comftable', '拼写错误', 'system'),
('pub-006', 'tomorrow', 'təˈmɒrəʊ', '明天', 'unlearned', 'tommorow', '双写错误', 'system'),
('pub-007', 'yesterday', 'ˈjestədeɪ', '昨天', 'unlearned', 'yestarday', '拼写错误', 'system'),
('pub-008', 'grammar', 'ˈɡræmə', '语法', 'unlearned', 'grammer', '拼写错误', 'system'),
('pub-009', 'chocolate', 'ˈtʃɒklət', '巧克力', 'unlearned', 'chocalate', '拼写错误', 'system'),
('pub-010', 'necessary', 'ˈnesəs(ə)ri', '必要的', 'unlearned', 'neccessary', '双写错误', 'system'),
('pub-011', 'accommodation', 'əˌkɒməˈdeɪʃ(ə)n', '住宿', 'unlearned', 'acommodation', '双写错误', 'system'),
('pub-012', 'different', 'ˈdɪf(ə)rənt', '不同的', 'unlearned', 'diffrent', '漏字母', 'system'),
('pub-013', 'temperature', 'ˈtemprətʃə', '温度', 'unlearned', 'temparature', '拼写错误', 'system'),
('pub-014', 'surprise', 'səˈpraɪz', '惊讶', 'unlearned', 'suprise', '拼写错误', 'system'),
('pub-015', 'government', 'ˈɡʌvənmənt', '政府', 'unlearned', 'goverment', '拼写错误', 'system'),
('pub-016', 'business', 'ˈbɪznəs', '商业', 'unlearned', 'bussiness', '双写错误', 'system'),
('pub-017', 'February', 'ˈfebruəri', '二月', 'unlearned', 'Febuary', '拼写错误', 'system'),
('pub-018', 'library', 'ˈlaɪbrəri', '图书馆', 'unlearned', 'librarry', '双写错误', 'system'),
('pub-019', 'questionnaire', 'ˌkwestʃəˈneə', '问卷', 'unlearned', 'questionaire', '拼写错误', 'system'),
('pub-020', 'recommend', 'ˌrekəˈmend', '推荐', 'unlearned', 'recomend', '双写错误', 'system'),
('pub-021', 'separate', 'ˈsepəreɪt', '分开', 'unlearned', 'seperate', '拼写错误', 'system'),
('pub-022', 'definitely', 'ˈdefɪnətli', '肯定地', 'unlearned', 'definately', '拼写错误', 'system'),
('pub-023', 'occurred', 'əˈkɜːd', '发生', 'unlearned', 'occured', '双写错误', 'system'),
('pub-024', 'embarrassed', 'ɪmˈbærəst', '尴尬的', 'unlearned', 'embarassed', '双写错误', 'system'),
('pub-025', 'millennium', 'mɪˈleniəm', '千年', 'unlearned', 'milennium', '拼写错误', 'system'),
('pub-026', 'privilege', 'ˈprɪvəlɪdʒ', '特权', 'unlearned', 'privelege', '拼写错误', 'system'),
('pub-027', 'desperate', 'ˈdespərət', '绝望的', 'unlearned', 'disperate', '拼写错误', 'system'),
('pub-028', 'perseverance', 'ˌpɜːsɪˈvɪərəns', '坚持', 'unlearned', 'perserverance', '拼写错误', 'system'),
('pub-029', 'independent', 'ˌɪndɪˈpendənt', '独立的', 'unlearned', 'independant', '拼写错误', 'system'),
('pub-030', 'conscience', 'ˈkɒnʃəns', '良心', 'unlearned', 'concience', '拼写错误', 'system'),
('pub-031', 'apparent', 'əˈpærənt', '明显的', 'unlearned', 'apparant', '双写错误', 'system'),
('pub-032', 'occasionally', 'əˈkeɪʒənəli', '偶尔', 'unlearned', 'ocasionally', '拼写错误', 'system'),
('pub-033', 'immediately', 'ɪˈmiːdiətli', '立即', 'unlearned', 'imediatly', '拼写错误', 'system'),
('pub-034', 'embarrassing', 'ɪmˈbærəsɪŋ', '令人尴尬的', 'unlearned', 'embarassing', '双写错误', 'system'),
('pub-035', 'thoroughly', 'ˈθʌrəli', '彻底地', 'unlearned', 'thuroughly', '拼写错误', 'system'),
('pub-036', 'successful', 'səkˈsesf(ə)l', '成功的', 'unlearned', 'sucessful', '拼写错误', 'system'),
('pub-037', 'neighbourhood', 'ˈneɪbəhʊd', '邻里', 'unlearned', 'neighborhod', '英式美式', 'system'),
('pub-038', 'anniversary', 'ˌænɪˈvɜːsəri', '周年纪念', 'unlearned', 'aniversary', '漏字母', 'system'),
('pub-039', 'enthusiasm', 'ɪnˈθjuːziæzəm', '热情', 'unlearned', 'enthusiasum', '拼写错误', 'system'),
('pub-040', 'foreign', 'ˈfɒrɪn', '外国的', 'unlearned', 'foriegn', '拼写错误', 'system'),
('pub-041', 'beginning', 'bɪˈɡɪnɪŋ', '开始', 'unlearned', 'beggining', '双写错误', 'system'),
('pub-042', 'knowledge', 'ˈnɒlɪdʒ', '知识', 'unlearned', 'knowlege', '拼写错误', 'system'),
('pub-043', 'psychology', 'saɪˈkɒlədʒi', '心理学', 'unlearned', 'pyschology', '拼写错误', 'system'),
('pub-044', 'August', 'ˈɔːɡəst', '八月', 'spelling', 'Agust', '拼写错误', 'system'),
('pub-045', 'cemetery', 'ˈsemətri', '墓地', 'spelling', 'cemetary', '拼写错误', 'system'),
('pub-046', 'calendar', 'ˈkælɪndə', '日历', 'spelling', 'calender', '拼写错误', 'system'),
('pub-047', 'achievement', 'əˈtʃiːvmənt', '成就', 'unlearned', 'achievment', '拼写错误', 'system'),
('pub-048', 'environment', 'ɪnˈvaɪərənmənt', '环境', 'unlearned', 'enviroment', '拼写错误', 'system'),
('pub-049', 'receive', 'rɪˈsiːv', '收到', 'unlearned', 'recieve', '拼写错误', 'system'),
('pub-050', 'believe', 'bɪˈliːv', '相信', 'unlearned', 'beleive', '拼写错误', 'system');

-- Step 5: 验证
SELECT '公共错题表创建成功' as status;
SELECT COUNT(*) as 公共错题数量 FROM vocab_public;
SELECT category, COUNT(*) as 数量 FROM vocab_public GROUP BY category;
