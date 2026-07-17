-- ============================================
-- 系统初始化脚本
-- 执行后：清空所有数据，重新创建公共错题库
-- ============================================

-- Step 1: 清空所有现有数据
TRUNCATE TABLE vocab_errors RESTART IDENTITY CASCADE;
TRUNCATE TABLE vocab_training RESTART IDENTITY CASCADE;
TRUNCATE TABLE vocab_batches RESTART IDENTITY CASCADE;

-- Step 2: 重新创建默认错题（公共）- 共50条常见易错词
INSERT INTO vocab_errors (id, word, phonetic, meaning, category, wrong_answer, error_note, tip, unit, status, mastered_modes, confused_with, correct_count, share_type, owner_id, batch_id)
VALUES
  ('public-001', 'Wednesday', 'ˈwenzdeɪ', '星期三', 'unlearned', 'wesneday', '漏字母 d', '', 'Weekdays', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-002', 'colourful', 'ˈkʌləf(ə)l', '丰富多彩的', 'unlearned', 'colorful', '英式美式拼写', '', 'Unit 1', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-003', 'beautiful', 'ˈbjuːtɪf(ə)l', '美丽的', 'unlearned', 'beautifull', '漏字母 e', '', 'Unit 1', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-004', 'restaurant', 'ˈrestrɒnt', '餐厅', 'unlearned', 'restrant', '少字母 au', '', 'Unit 2', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-005', 'comfortable', 'ˈkʌmftəb(ə)l', '舒适的', 'unlearned', 'comftable', '拼写错误', '', 'Unit 2', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-006', 'tomorrow', 'təˈmɒrəʊ', '明天', 'unlearned', 'tommorow', '双写错误', '', 'Time', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-007', 'yesterday', 'ˈjestədeɪ', '昨天', 'unlearned', 'yestarday', '拼写错误', '', 'Time', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-008', 'grammar', 'ˈɡræmə', '语法', 'unlearned', 'grammer', '拼写错误', '', 'Unit 3', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-009', 'chocolate', 'ˈtʃɒklət', '巧克力', 'unlearned', 'chocalate', '拼写错误', '', 'Food', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-010', 'necessary', 'ˈnesəs(ə)ri', '必要的', 'unlearned', 'neccessary', '双写错误', '', 'Unit 4', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-011', 'accommodation', 'əˌkɒməˈdeɪʃ(ə)n', '住宿', 'unlearned', 'acommodation', '双写错误', '', 'Travel', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-012', 'different', 'ˈdɪf(ə)rənt', '不同的', 'unlearned', 'diffrent', '漏字母', '', 'Unit 5', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-013', 'temperature', 'ˈtemprətʃə', '温度', 'unlearned', 'temparature', '拼写错误', '', 'Weather', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-014', 'surprise', 'səˈpraɪz', '惊讶', 'unlearned', 'suprise', '拼写错误', '', 'Emotions', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-015', 'government', 'ˈɡʌvənmənt', '政府', 'unlearned', 'goverment', '拼写错误', '', 'Politics', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-016', 'business', 'ˈbɪznəs', '商业', 'unlearned', 'bussiness', '双写错误', '', 'Work', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-017', 'February', 'ˈfebruəri', '二月', 'unlearned', 'Febuary', '拼写错误', '', 'Months', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-018', 'library', 'ˈlaɪbrəri', '图书馆', 'unlearned', 'librarry', '双写错误', '', 'Places', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-019', 'questionnaire', 'ˌkwestʃəˈneə', '问卷', 'unlearned', 'questionaire', '拼写错误', '', 'Unit 6', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-020', 'recommend', 'ˌrekəˈmend', '推荐', 'unlearned', 'recomend', '双写错误', '', 'Unit 7', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-021', 'separate', 'ˈsepəreɪt', '分开', 'unlearned', 'seperate', '拼写错误', '', 'Unit 8', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-022', 'definitely', 'ˈdefɪnətli', '肯定地', 'unlearned', 'definately', '拼写错误', '', 'Unit 9', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-023', 'occurred', 'əˈkɜːd', '发生', 'unlearned', 'occured', '双写错误', '', 'Unit 10', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-024', 'embarrassed', 'ɪmˈbærəst', '尴尬的', 'unlearned', 'embarassed', '双写错误', '', 'Emotions', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-025', 'millennium', 'mɪˈleniəm', '千年', 'unlearned', 'milennium', '拼写错误', '', 'Time', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-026', 'privilege', 'ˈprɪvəlɪdʒ', '特权', 'unlearned', 'privelege', '拼写错误', '', 'Unit 11', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-027', 'desperate', 'ˈdespərət', '绝望的', 'unlearned', 'disperate', '拼写错误', '', 'Emotions', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-028', 'perseverance', 'ˌpɜːsɪˈvɪərəns', '坚持', 'unlearned', 'perserverance', '拼写错误', '', 'Character', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-029', 'independent', 'ˌɪndɪˈpendənt', '独立的', 'unlearned', 'independant', '拼写错误', '', 'Unit 12', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-030', 'conscience', 'ˈkɒnʃəns', '良心', 'unlearned', 'concience', '拼写错误', '', 'Character', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-031', 'apparent', 'əˈpærənt', '明显的', 'unlearned', 'apparant', '双写错误', '', 'Unit 13', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-032', 'millennia', 'mɪˈleniə', '千年（复数）', 'unlearned', 'milennia', '拼写错误', '', 'Time', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-033', 'occasionally', 'əˈkeɪʒənəli', '偶尔', 'unlearned', 'ocasionally', '拼写错误', '', 'Frequency', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-034', 'restaurant', 'ˈrestrɒnt', '餐馆', 'unlearned', 'restaraunt', '拼写错误', '', 'Food', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-035', 'immediately', 'ɪˈmiːdiətli', '立即', 'unlearned', 'imediatly', '拼写错误', '', 'Unit 14', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-036', 'embarrassing', 'ɪmˈbærəsɪŋ', '令人尴尬的', 'unlearned', 'embarassing', '双写错误', '', 'Emotions', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-037', 'thoroughly', 'ˈθʌrəli', '彻底地', 'unlearned', 'thuroughly', '拼写错误', '', 'Unit 15', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-038', 'successful', 'səkˈsesf(ə)l', '成功的', 'unlearned', 'sucessful', '拼写错误', '', 'Unit 16', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-039', 'neighbourhood', 'ˈneɪbəhʊd', '邻里', 'unlearned', 'neighborhod', '英式美式', '', 'Places', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-040', 'anniversary', 'ˌænɪˈvɜːsəri', '周年纪念', 'unlearned', 'aniversary', '漏字母', '', 'Events', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-041', 'enthusiasm', 'ɪnˈθjuːziæzəm', '热情', 'unlearned', 'enthusiasum', '拼写错误', '', 'Character', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-042', 'foreign', 'ˈfɒrɪn', '外国的', 'unlearned', 'foriegn', '拼写错误', '', 'Countries', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-043', 'beginning', 'bɪˈɡɪnɪŋ', '开始', 'unlearned', 'beggining', '双写错误', '', 'Unit 17', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-044', 'knowledge', 'ˈnɒlɪdʒ', '知识', 'unlearned', 'knowlege', '拼写错误', '', 'Learning', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-045', 'psychology', 'saɪˈkɒlədʒi', '心理学', 'unlearned', 'pyschology', '拼写错误', '', 'Science', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-046', 'Wednesday', 'ˈwenzdeɪ', '星期三', 'spelling', 'wensday', '拼写错误', '', 'Days', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-047', 'August', 'ˈɔːɡəst', '八月', 'spelling', 'Agust', '拼写错误', '', 'Months', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-048', 'February', 'ˈfebruəri', '二月', 'spelling', 'Febuary', '拼写错误', '', 'Months', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-049', 'cemetery', 'ˈsemətri', '墓地', 'spelling', 'cemetary', '拼写错误', '', 'Places', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial'),
  ('public-050', 'calendar', 'ˈkælɪndə', '日历', 'spelling', 'calender', '拼写错误', '', 'Unit 18', 'pending', '{}', '{}', 0, 'public', 'system', 'batch-initial');

-- Step 3: 创建初始化批次记录
INSERT INTO vocab_batches (id, source, total_imported, created_at)
VALUES ('batch-initial', 'system-init', 50, NOW());

-- Step 4: 验证结果
SELECT '错题数量' as 指标, COUNT(*) as 数值 FROM vocab_errors
UNION ALL
SELECT '公共错题', COUNT(*) FROM vocab_errors WHERE share_type = 'public'
UNION ALL
SELECT '私有错题', COUNT(*) FROM vocab_errors WHERE share_type = 'private'
UNION ALL
SELECT '用户数量', COUNT(DISTINCT owner_id) FROM vocab_errors;

-- 显示错题分布
SELECT share_type, COUNT(*) as 数量 FROM vocab_errors GROUP BY share_type;
