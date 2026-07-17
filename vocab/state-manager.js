/**
 * Lumos Vocab - StateManager v1.2
 * 英语词汇错题训练系统的状态管理模块
 *
 * 支持功能：
 * - 错题 CRUD 操作
 * - 训练记录管理
 * - 批次管理
 * - 线下测试记录
 * - 数据导入/导出
 * - 双模式支持：localStorage / Supabase 云端
 * - 混淆词掌握状态追踪
 */

const VocabStateManager = (() => {
  // ========== 配置 ==========
  const CONFIG = {
    // 存储模式：'local' = localStorage, 'cloud' = Supabase
    STORAGE_MODE: 'cloud',

    // Supabase 配置（STORAGE_MODE = 'cloud' 时使用）
    SUPABASE_URL: 'https://dmxytyvleoodvaggvkdg.supabase.co',
    SUPABASE_KEY: 'sb_publishable_KIUoi4AebdtwJDMrPeq01w_i_m7MGNz'
  };

  // ========== 常量 ==========
  const VERSION = '1.2';  // 支持公共错题库
  const PREFIX = 'lumos:vocab';
  const DATA_VERSION = '6.0';

  // localStorage keys
  const KEYS = {
    ERRORS:           `${PREFIX}:errors`,
    TRAINING:         `${PREFIX}:training`,
    BATCHES:          `${PREFIX}:batches`,
    OFFLINE:          `${PREFIX}:offline`,
    SETTINGS:         `${PREFIX}:settings`,
    LAST_EXPORT:      `${PREFIX}:last-export`,
    CONFUSION_MASTERED: `${PREFIX}:confusion-mastered`,  // 已掌握的混淆词对
  };

  // 错因分类（简化版：只分 2 类）
  const CATEGORIES = {
    UNLEARNED: 'unlearned',   // 未学会（完全想不起来）
    SPELLING:  'spelling',    // 拼写错误（知道但写错）
  };

  // 错题状态
  const STATUS = {
    PENDING:    'pending',     // 待复习
    PRACTICING: 'practicing',  // 练习中
    MASTERED:   'mastered',    // 已掌握
  };

  // 训练模式
  const MODES = {
    FLASH_WAR:    'flash_war',    // 词汇闪电战
    SPELLING:     'spelling',     // 拼写特训营
    CONFUSION:    'confusion',    // 混淆词大作战
    FROM_ZERO:    'from_zero',    // 从零学词
    REVIEW:       'review',       // 复盘
  };

  // 混淆词对定义（从数据中识别 + 常见易混词对）
  const CONFUSION_PAIRS = [
    { word: 'quick', meaning: 'adj.快的;迅速的', confused: 'quite', confusedMeaning: '相当;十分' },
    { word: 'then', meaning: 'adv*.然后；当时;那么', confused: 'than', confusedMeaning: '比' },
    { word: 'challenge', meaning: 'n. 挑战', confused: 'change', confusedMeaning: '改变' },
    { word: 'medium', meaning: 'n. 媒介，手段', confused: 'middle', confusedMeaning: '中间' },
    { word: 'ski', meaning: 'v*.滑雪', confused: 'sky', confusedMeaning: '天空' },
    { word: 'piece', meaning: 'n.片;块', confused: 'peace', confusedMeaning: '和平' },
    { word: 'means', meaning: 'n.方式;方法;途径', confused: 'mines', confusedMeaning: '矿井' },
    { word: 'mine', meaning: 'pron.我的 n.矿;矿井', confused: 'main', confusedMeaning: '主要的' },
    { word: 'sore', meaning: 'adj. (发炎) 疼痛的；酸痛的', confused: 'soar', confusedMeaning: '翱翔' },
    { word: 'he', meaning: 'pron*.他', confused: 'him', confusedMeaning: '他（宾格）' },
    { word: 'she', meaning: 'pron*.她', confused: 'her', confusedMeaning: '她（宾格/所有格）' },
    { word: 'east', meaning: 'n. 东；东方', confused: 'west', confusedMeaning: '西方' },
    { word: 'height', meaning: 'n. 身高；高度', confused: 'high', confusedMeaning: '高的' },
    { word: 'shine', meaning: 'v. 出色；发光', confused: 'fine', confusedMeaning: '好的；细的' },
    { word: 'sale', meaning: 'n.特价销售;出售', confused: 'sell', confusedMeaning: '卖（动词）' },
    { word: 'loss', meaning: 'n.丧失；损失', confused: 'lose', confusedMeaning: '丢失（动词）' },
    { word: 'raise', meaning: 'v*.提升，举起；增加', confused: 'rise', confusedMeaning: '升起；起立' },
    { word: 'text', meaning: 'n*.文章；文本，正文', confused: 'test', confusedMeaning: '测试' },
    { word: 'advice', meaning: 'n.劝告；建议', confused: 'advise', confusedMeaning: 'v. 劝告；建议' },
    { word: 'weather', meaning: 'n.天气', confused: 'whether', confusedMeaning: '是否' },
    { word: 'through', meaning: 'prep.穿过', confused: 'though', confusedMeaning: '虽然' },
    { word: 'accept', meaning: 'v. 接受', confused: 'except', confusedMeaning: '除了' },
    { word: 'effect', meaning: 'n.结果；影响', confused: 'affect', confusedMeaning: 'v. 影响' },
    { word: 'principle', meaning: 'n.原则', confused: 'principal', confusedMeaning: 'adj. 主要的；校长' },
    { word: 'quiet', meaning: 'adj.安静的', confused: 'quite', confusedMeaning: 'adv. 相当；十分' },
    { word: 'beside', meaning: 'prep.在...旁边', confused: 'besides', confusedMeaning: 'adv. 而且；此外' },
    { word: 'lie', meaning: 'v. 位于；躺；撒谎', confused: 'lay', confusedMeaning: 'v. 放置；下蛋' },
    { word: 'sit', meaning: 'v. 坐', confused: 'set', confusedMeaning: 'v. 设置；放置' },
    { word: 'wear', meaning: 'v. 穿（持续）', confused: 'put on', confusedMeaning: '穿上（动作）' },
    { word: 'study', meaning: 'v./n. 学习（持续）', confused: 'learn', confusedMeaning: '学会（结果）' },
    { word: 'expensive', meaning: 'adj.昂贵的', confused: 'cheap', confusedMeaning: 'adj. 便宜的' },
    { word: 'lost', meaning: 'adj.丢失的', confused: 'lose', confusedMeaning: 'v. 丢失' },
  ];

  // 从数据中识别混淆词对
  function getConfusionPairsFromErrors() {
    const errors = getAllErrors();
    const pairs = [];
    const processed = new Set();

    for (const e of errors) {
      if (processed.has(e.word.toLowerCase())) continue;

      const note = (e.errorNote || '').toLowerCase();
      const meaning = (e.meaning || '').toLowerCase();

      // 识别主/宾格混淆
      if (note.includes('主/宾格') || note.includes('主格') || note.includes('宾格')) {
        if (e.word === 'he' || e.word === 'she') {
          const other = e.word === 'he' ? { word: 'she', meaning: '她' } : { word: 'he', meaning: '他' };
          pairs.push({
            word: e.word,
            meaning: e.meaning,
            confused: other.word,
            confusedMeaning: other.meaning,
            type: '主格/宾格'
          });
          processed.add(e.word.toLowerCase());
          processed.add(other.word.toLowerCase());
        }
      }

      // 识别名词/动词混淆
      if (note.includes('名/动') || note.includes('名/动混淆')) {
        // 尝试找配对
        for (const e2 of errors) {
          if (e2.word.toLowerCase() === e.word.toLowerCase()) continue;
          if (processed.has(e2.word.toLowerCase())) continue;

          const note2 = (e2.errorNote || '').toLowerCase();
          if (note2.includes('名/动') || note2.includes('名/动混淆')) {
            pairs.push({
              word: e.word,
              meaning: e.meaning,
              confused: e2.word,
              confusedMeaning: e2.meaning,
              type: '名词/动词'
            });
            processed.add(e.word.toLowerCase());
            processed.add(e2.word.toLowerCase());
            break;
          }
        }
      }
    }

    return pairs;
  }

  // ========== 内部工具函数 ==========

  function safeJsonParse(raw, defaultValue) {
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[VocabStateManager] JSON.parse 失败:', e);
      return defaultValue;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('[VocabStateManager] localStorage 配额已满');
        // 尝试清理旧数据
        cleanupOldData();
        localStorage.setItem(key, value);
      } else {
        throw e;
      }
    }
  }

  function generateId() {
    return 've-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
  }

  function generateBatchId() {
    return 'batch-' + new Date().toISOString().split('T')[0];
  }

  // 清理旧数据（保留最近100条训练记录）
  function cleanupOldData() {
    const training = safeJsonParse(localStorage.getItem(KEYS.TRAINING), []);
    if (training.length > 100) {
      const toSave = training.slice(-100);
      localStorage.setItem(KEYS.TRAINING, JSON.stringify(toSave));
    }
  }

  // ========== 错题管理 ==========

  // 检查是否需要初始化数据（首次使用或数据为空）
  let _initialized = false;
  let _initPromise = null;
  let _useCloud = false;  // 是否使用云端模式

  // 检查是否使用云端模式
  function isCloudMode() {
    return CONFIG.STORAGE_MODE === 'cloud' && CloudStorage && CloudStorage.isConfigured();
  }

  async function ensureInitialized() {
    // 如果已经初始化过，直接返回
    if (_initialized) {
      console.log('[VocabStateManager] 已初始化，跳过');
      return;
    }

    // 如果正在初始化中，等待完成
    if (_initPromise) {
      console.log('[VocabStateManager] 正在初始化中，等待...');
      await _initPromise;
      return;
    }

    // 初始化云端（如果配置了）
    if (CONFIG.STORAGE_MODE === 'cloud' && CloudStorage) {
      CloudStorage.init(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
      _useCloud = CloudStorage.isConfigured();
    }

    if (_useCloud) {
      // 云端模式
      console.log('[VocabStateManager] 使用云端存储模式');
      _initPromise = initCloudMode();
    } else {
      // 本地模式
      console.log('[VocabStateManager] 使用本地存储模式');
      _initPromise = initLocalMode();
    }

    await _initPromise;
    _initialized = true;
    console.log('[VocabStateManager] 初始化完成');
  }

  // 云端模式初始化
  async function initCloudMode() {
    try {
      const result = await CloudStorage.getErrors();
      if (result.error) {
        console.error('[VocabStateManager] 云端获取失败:', result.error);
        // 回退到本地模式
        _useCloud = false;
        await initLocalMode();
        return;
      }

      if (result.data && result.data.length > 0) {
        console.log('[VocabStateManager] 从云端加载了 ' + result.data.length + ' 条错题');
        _cloudErrors = result.data;
        return;
      }

      // 云端没有数据，从本地 JSON 导入
      console.log('[VocabStateManager] 云端暂无数据，从 JSON 导入...');
      await importFromJsonToCloud();
    } catch (e) {
      console.error('[VocabStateManager] 云端初始化失败:', e);
      _useCloud = false;
      await initLocalMode();
    }
  }

  // 从 JSON 文件导入到云端
  async function importFromJsonToCloud() {
    try {
      const response = await fetch('data/errors.json');
      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        const errors = data.errors.map((e, index) => ({
          id: 've-' + (index + 1).toString().padStart(3, '0'),
          word: e.word,
          phonetic: e.phonetic || '',
          meaning: e.meaning,
          category: e.category || CATEGORIES.UNLEARNED,
          wrongAnswer: e.wrongAnswer || '',
          errorNote: e.errorNote || '',
          tip: e.tip || '',
          unit: e.unit || '',
          status: STATUS.PENDING,
          masteredModes: [],
          confusedWith: [],
          correctCount: 0,
          createdAt: new Date().toISOString(),
          lastPracticedAt: null,
          batchId: 'batch-initial',
        }));

        await CloudStorage.saveErrors(errors);
        _cloudErrors = errors;
        console.log('[VocabStateManager] 已导入 ' + errors.length + ' 条到云端');
      }
    } catch (e) {
      console.error('[VocabStateManager] JSON 导入失败:', e);
    }
  }

  // 本地模式初始化
  async function initLocalMode() {
    // 检查数据版本
    const savedVersion = localStorage.getItem(PREFIX + ':data-version');
    const existingErrors = getAllErrors();

    if (savedVersion === DATA_VERSION && existingErrors.length > 0) {
      console.log('[VocabStateManager] localStorage 已有 ' + existingErrors.length + ' 条数据（版本一致）');
      return;
    } else {
      console.log('[VocabStateManager] 数据版本不匹配或为空，清除旧数据并重新加载');
      localStorage.removeItem(KEYS.ERRORS);
    }

    // 尝试从本地 JSON 文件加载数据
    console.log('[VocabStateManager] 开始从 JSON 加载...');
    try {
      const response = await fetch('data/errors.json');

      if (!response.ok) {
        console.warn('[VocabStateManager] fetch 失败, status:', response.status);
        return;
      }

      const data = await response.json();
      console.log('[VocabStateManager] JSON 解析完成，errors 数量:', data.errors ? data.errors.length : 0);

      if (data.errors && data.errors.length > 0) {
        const errors = data.errors.map((e, index) => ({
          id: 've-' + (index + 1).toString().padStart(3, '0'),
          word: e.word,
          phonetic: e.phonetic || '',
          meaning: e.meaning,
          category: e.category || CATEGORIES.UNLEARNED,
          wrongAnswer: e.wrongAnswer || '',
          errorNote: e.errorNote || '',
          tip: e.tip || '',
          unit: e.unit || '',
          status: STATUS.PENDING,
          masteredModes: [],
          confusedWith: [],
          correctCount: 0,
          createdAt: new Date().toISOString(),
          lastPracticedAt: null,
          batchId: 'batch-initial',
        }));

        saveAllErrors(errors);
        console.log('[VocabStateManager] 已保存 ' + errors.length + ' 条到 localStorage');

        // 保存数据版本
        localStorage.setItem(PREFIX + ':data-version', DATA_VERSION);
      }
    } catch (e) {
      console.error('[VocabStateManager] 加载本地数据失败:', e);
    }
  }

  // 云端数据缓存
  let _cloudErrors = [];
  let _cloudTraining = [];

  // 获取所有错题
  function getAllErrors() {
    if (_useCloud) {
      return _cloudErrors;
    }
    return safeJsonParse(localStorage.getItem(KEYS.ERRORS), []);
  }

  // 保存所有错题
  function saveAllErrors(errors) {
    if (_useCloud) {
      _cloudErrors = errors;
      CloudStorage.saveErrors(errors);
      return;
    }
    safeSetItem(KEYS.ERRORS, JSON.stringify(errors));
  }

  // 添加错题
  function addError(error, options = {}) {
    const errors = getAllErrors();
    const newError = {
      id: generateId(),
      word: error.word,
      phonetic: error.phonetic || '',
      meaning: error.meaning,
      category: error.category || CATEGORIES.UNLEARNED,
      wrongAnswer: error.wrongAnswer || '',
      errorNote: error.errorNote || '',
      status: STATUS.PENDING,
      correctCount: 0,
      createdAt: new Date().toISOString(),
      lastPracticedAt: null,
      batchId: error.batchId || generateBatchId(),
      // 混合模式字段
      visibility: error.visibility || options.visibility || 'private',
      ownerId: options.ownerId || CloudStorage?.getCurrentUserId?.() || 'local',
    };
    errors.push(newError);
    saveAllErrors(errors);
    return newError;
  }

  // 批量添加错题（导入时用）
  function addErrorsBatch(errorsList, batchId, options = {}) {
    const errors = getAllErrors();
    const existingWords = new Set(errors.map(e => e.word.toLowerCase()));
    const batchErrors = [];
    const duplicates = [];
    const visibility = options.visibility || 'private';  // 默认私有

    for (const error of errorsList) {
      if (existingWords.has(error.word.toLowerCase())) {
        duplicates.push(error.word);
        continue;
      }

      const newError = {
        id: generateId(),
        word: error.word,
        phonetic: error.phonetic || '',
        meaning: error.meaning,
        category: error.category || CATEGORIES.UNLEARNED,
        wrongAnswer: error.wrongAnswer || '',
        errorNote: error.errorNote || '',
        status: STATUS.PENDING,
        correctCount: 0,
        createdAt: new Date().toISOString(),
        lastPracticedAt: null,
        batchId: batchId || generateBatchId(),
        // 混合模式字段
        visibility: visibility,
        ownerId: options.ownerId || CloudStorage?.getCurrentUserId?.() || 'local',
      };
      errors.push(newError);
      batchErrors.push(newError);
      existingWords.add(error.word.toLowerCase());
    }

    saveAllErrors(errors);
    return { added: batchErrors, duplicates };
  }

  // 获取单个错题
  function getError(id) {
    const errors = getAllErrors();
    return errors.find(e => e.id === id) || null;
  }

  // 更新错题
  function updateError(id, updates) {
    const errors = getAllErrors();
    const index = errors.findIndex(e => e.id === id);
    if (index === -1) return null;

    errors[index] = { ...errors[index], ...updates };
    saveAllErrors(errors);

    // 云端同步
    if (_useCloud) {
      CloudStorage.updateError(id, updates);
    }

    return errors[index];
  }

  // 删除错题
  function deleteError(id) {
    const errors = getAllErrors();
    const filtered = errors.filter(e => e.id !== id);
    saveAllErrors(filtered);
  }

  // 获取待复习的错题
  function getPendingErrors() {
    const errors = getAllErrors();
    return errors.filter(e => e.status !== STATUS.MASTERED);
  }

  // 获取已掌握的错题
  function getMasteredErrors() {
    const errors = getAllErrors();
    return errors.filter(e => e.status === STATUS.MASTERED);
  }

  // 获取随机待复习错题（用于训练，可排除指定词）
  function getRandomPendingError(excludeIds) {
    let pending = getPendingErrors();

    // 排除指定 ID（本次训练中已正确回答过的词）
    if (excludeIds && excludeIds.length > 0) {
      const excludeSet = new Set(excludeIds);
      pending = pending.filter(e => !excludeSet.has(e.id));
    }

    if (pending.length === 0) return null;
    return pending[Math.floor(Math.random() * pending.length)];
  }

  // 获取下一个待复习词（按顺序，减少随机性）
  function getNextPendingError(excludeIds) {
    let pending = getPendingErrors();

    // 排除指定 ID
    if (excludeIds && excludeIds.length > 0) {
      const excludeSet = new Set(excludeIds);
      pending = pending.filter(e => !excludeSet.has(e.id));
    }

    // 按上次练习时间排序，优先练习很久没练的
    pending.sort((a, b) => {
      const aTime = a.lastPracticedAt ? new Date(a.lastPracticedAt).getTime() : 0;
      const bTime = b.lastPracticedAt ? new Date(b.lastPracticedAt).getTime() : 0;
      return aTime - bTime; // 早练习的排在前面
    });

    if (pending.length === 0) return null;
    return pending[0];
  }


  // ========== 混淆词大作战专用方法 ==========

  // 获取所有混淆词对（预设 + 从数据识别）
  function getAllConfusionPairs() {
    const pairs = [...CONFUSION_PAIRS];
    const fromErrors = getConfusionPairsFromErrors();
    for (const p of fromErrors) {
      // 避免重复
      const exists = pairs.some(ex =>
        (ex.word.toLowerCase() === p.word.toLowerCase()) ||
        (ex.word.toLowerCase() === p.confused.toLowerCase())
      );
      if (!exists) {
        pairs.push(p);
      }
    }
    return pairs;
  }

  // 获取混淆词对练习题目（随机打乱）
  function getConfusionQuestions(count = null) {
    const pairs = getAllConfusionPairs();
    // 随机打乱
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    // 如果没有指定数量，返回全部
    if (count === null) {
      return shuffled;
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // ========== 混淆词掌握状态追踪 ==========

  // 获取已掌握的混淆词对 key（用于去重）
  function getConfusionMasteredPairs() {
    return safeJsonParse(localStorage.getItem(KEYS.CONFUSION_MASTERED), []);
  }

  // 标记混淆词对为已掌握
  function markConfusionPairMastered(pairKey) {
    const mastered = getConfusionMasteredPairs();
    if (!mastered.includes(pairKey)) {
      mastered.push(pairKey);
      localStorage.setItem(KEYS.CONFUSION_MASTERED, JSON.stringify(mastered));
    }
  }

  // 获取待练习的混淆词对（排除已掌握的）
  function getConfusionQuestionsForPractice(count = null) {
    const allPairs = getAllConfusionPairs();
    const mastered = getConfusionMasteredPairs();

    // 过滤掉已掌握的词对
    const pendingPairs = allPairs.filter(pair => {
      const key = generateConfusionPairKey(pair);
      return !mastered.includes(key);
    });

    // 随机打乱
    const shuffled = [...pendingPairs].sort(() => Math.random() - 0.5);

    if (count === null) {
      return shuffled;
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // 生成混淆词对的唯一 key（用于追踪）
  function generateConfusionPairKey(pair) {
    // 使用字母序较小的词作为主键，确保唯一性
    const words = [pair.word.toLowerCase(), pair.confused.toLowerCase()].sort();
    return words.join('||');
  }

  // 重置混淆词掌握状态（全部重新练习）
  function resetConfusionMastered() {
    localStorage.removeItem(KEYS.CONFUSION_MASTERED);
  }

  // 获取已掌握的混淆词对数量
  function getConfusionMasteredCount() {
    return getConfusionMasteredPairs().length;
  }

  // 获取混淆词对总数量
  function getConfusionTotalCount() {
    return getAllConfusionPairs().length;
  }

  // ========== 从零学词专用方法 ==========

  // 获取适合"从零学词"的词（完全不会的）
  function getFromZeroWords() {
    const errors = getAllErrors();
    // 筛选：状态为 pending 或 practicing，且从未被标记为 practicing 的
    // 简化：返回未掌握的词，按创建时间排序
    return errors
      .filter(e => e.status !== STATUS.MASTERED)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  // 获取单词的音节提示
  function getSyllableHint(word) {
    // 简单的音节分割
    // 规则：元音+辅音+元音 = 可以分割
    const vowels = 'aeiouAEIOU';
    const result = [];
    let start = 0;

    for (let i = 0; i < word.length - 1; i++) {
      const curr = word[i];
      const next = word[i + 1];

      // 找到元音后，看后面是否有辅音+元音（可分割点）
      if (vowels.includes(curr) && !vowels.includes(next)) {
        // 继续找后面的元音
        for (let j = i + 1; j < word.length; j++) {
          if (vowels.includes(word[j])) {
            // 在 curr(元音) + next(辅音) + word[j](元音) 处分割
            result.push(word.substring(start, j));
            start = j;
            i = j - 1; // 调整外层循环位置
            break;
          }
        }
      }
    }

    // 添加剩余部分
    if (start < word.length) {
      result.push(word.substring(start));
    }

    // 如果只有一个音节但单词较长（>4个字母），尝试按字母拆分
    if (result.length === 1 && word.length > 4) {
      // 尝试按辅音簇分割
      const parts = [];
      let part = '';
      let lastWasVowel = false;

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const isVowel = vowels.includes(char);

        if (part.length > 0 && isVowel !== lastWasVowel && part.length >= 1) {
          parts.push(part);
          part = char;
        } else {
          part += char;
        }
        lastWasVowel = isVowel;
      }
      if (part) parts.push(part);

      // 如果分割成2个或更多部分，使用它
      if (parts.length > 1) {
        return parts;
      }
    }

    // 如果只有一个音节，对于短单词，按2-3个字母一组拆分
    if (result.length === 1 && word.length > 2) {
      const parts = [];
      for (let i = 0; i < word.length; i += 2) {
        parts.push(word.substring(i, Math.min(i + 2, word.length)));
      }
      return parts;
    }

    // 如果单词太短（<=2个字母），每个字母作为一组
    if (result.length === 1 && word.length <= 2) {
      return word.split('');
    }

    return result;
  }

  // 答对错题（答对1次就标记为已掌握，记录通过的模式）
  function markCorrect(id, mode) {
    const error = getError(id);
    if (!error) return null;

    // 记录通过的模式
    if (mode && !error.masteredModes.includes(mode)) {
      error.masteredModes.push(mode);
    }

    // 标记为已掌握
    error.correctCount = 1;
    error.status = STATUS.MASTERED;
    error.lastPracticedAt = new Date().toISOString();

    return updateError(id, error);
  }

  // 获取词通过的模式列表
  function getMasteredModes(id) {
    const error = getError(id);
    if (!error) return [];
    return error.masteredModes || [];
  }

  // 答错错题（重置正确次数）
  function markIncorrect(id) {
    const error = getError(id);
    if (!error) return null;

    error.correctCount = 0;
    error.status = STATUS.PRACTICING;
    error.lastPracticedAt = new Date().toISOString();

    return updateError(id, error);
  }

  // 重置所有错题状态
  function resetAllErrors() {
    const errors = getAllErrors();
    errors.forEach(e => {
      e.correctCount = 0;
      e.status = STATUS.PENDING;
      e.lastPracticedAt = null;
    });
    saveAllErrors(errors);
  }

  // ========== 训练记录管理 ==========

  // 保存训练记录
  function saveTrainingRecord(record) {
    const newRecord = {
      id: generateId(),
      errorId: record.errorId,
      mode: record.mode || MODES.FLASH_WAR,
      date: new Date().toISOString(),
      isCorrect: record.isCorrect,
      responseTime: record.responseTime || 0,
    };

    if (_useCloud) {
      _cloudTraining.push(newRecord);
      // 限制最多 100 条
      if (_cloudTraining.length > 100) {
        _cloudTraining = _cloudTraining.slice(-100);
      }
      CloudStorage.saveTrainingRecord(newRecord);
    } else {
      const records = safeJsonParse(localStorage.getItem(KEYS.TRAINING), []);
      records.push(newRecord);
      // 限制最多 100 条
      const toSave = records.slice(-100);
      safeSetItem(KEYS.TRAINING, JSON.stringify(toSave));
    }

    return newRecord;
  }

  // 获取训练记录
  function getTrainingRecords(limit) {
    if (_useCloud) {
      const records = _cloudTraining;
      return limit ? records.slice(-limit) : records;
    }
    const records = safeJsonParse(localStorage.getItem(KEYS.TRAINING), []);
    return limit ? records.slice(-limit) : records;
  }

  // 获取今日训练统计
  function getTodayStats() {
    const records = getTrainingRecords();
    const today = new Date().toISOString().split('T')[0];

    const todayRecords = records.filter(r => r.date.startsWith(today));
    const correct = todayRecords.filter(r => r.isCorrect).length;
    const total = todayRecords.length;

    return {
      total,
      correct,
      incorrect: total - correct,
      accuracy: total > 0 ? Math.round(correct / total * 100) : 0,
    };
  }

  // 清除训练记录
  function clearTrainingRecords() {
    if (_useCloud) {
      _cloudTraining = [];
    }
    localStorage.removeItem(KEYS.TRAINING);
  }

  // ========== 批次管理 ==========

  // 获取所有批次
  function getAllBatches() {
    return safeJsonParse(localStorage.getItem(KEYS.BATCHES), []);
  }

  // 创建新批次
  function createBatch(info) {
    const batches = getAllBatches();
    const batch = {
      id: generateBatchId(),
      source: info.source || 'manual',
      totalImported: info.totalImported || 0,
      createdAt: new Date().toISOString(),
    };
    batches.push(batch);
    safeSetItem(KEYS.BATCHES, JSON.stringify(batches));
    return batch;
  }

  // 获取批次统计
  function getBatchStats(batchId) {
    const errors = getAllErrors();
    const batchErrors = errors.filter(e => e.batchId === batchId);

    return {
      total: batchErrors.length,
      mastered: batchErrors.filter(e => e.status === STATUS.MASTERED).length,
      practicing: batchErrors.filter(e => e.status === STATUS.PRACTICING).length,
      pending: batchErrors.filter(e => e.status === STATUS.PENDING).length,
    };
  }

  // ========== 统计汇总 ==========

  // 获取全局统计
  function getStats() {
    const errors = getAllErrors();
    return {
      total: errors.length,
      mastered: errors.filter(e => e.status === STATUS.MASTERED).length,
      practicing: errors.filter(e => e.status === STATUS.PRACTICING).length,
      pending: errors.filter(e => e.status === STATUS.PENDING).length,
      unlearned: errors.filter(e => e.category === CATEGORIES.UNLEARNED).length,
      spelling: errors.filter(e => e.category === CATEGORIES.SPELLING).length,
    };
  }

  // 获取本周进度（相对于7天前）
  function getWeeklyProgress() {
    const errors = getAllErrors();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const masteredThisWeek = errors.filter(e =>
      e.status === STATUS.MASTERED &&
      e.lastPracticedAt &&
      new Date(e.lastPracticedAt).getTime() > sevenDaysAgo
    ).length;

    return { masteredThisWeek };
  }

  // ========== 导入/导出 ==========

  // 解析 TSV 文本（增强版：支持多种格式）
  function parseTSV(tsvText) {
    const lines = tsvText.trim().split('\n');
    if (lines.length < 1) {
      console.warn('[parseTSV] 没有数据行');
      return [];
    }

    // 检测第一行是否是表头
    const firstLine = lines[0].toLowerCase();
    const isHeaderRow = firstLine.includes('word') || firstLine.includes('单词') ||
                        firstLine.includes('meaning') || firstLine.includes('中文');

    let headers;
    let startIndex;

    if (isHeaderRow) {
      // 有表头
      headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
      startIndex = 1;
    } else {
      // 无表头，使用默认列名
      headers = ['word', 'phonetic', 'meaning', 'wronganswer', 'errornote'];
      startIndex = 0;
    }

    const results = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split('\t').map(v => v.trim());
      if (values.length < 2) continue;

      const item = {};
      headers.forEach((header, index) => {
        if (values[index]) {
          item[header] = values[index];
        }
      });

      // 兼容不同的列名
      const word = item.word || item.单词 || item.english;
      const meaning = item.meaning || item.中文 || item.释义;

      if (word && meaning) {
        results.push({
          word: word,
          phonetic: item.phonetic || item.音标 || '',
          meaning: meaning,
          wrongAnswer: item.wronganswer || item.wrong || item.错误版本 || '',
          errorNote: item.errornote || item.error || item.提示 || '',
          category: detectCategory(item.errornote || item.error || item.提示 || ''),
        });
      } else {
        console.warn('[parseTSV] 跳过无效行 ' + (i + 1) + ':', line);
      }
    }

    console.log('[parseTSV] 解析完成，共 ' + results.length + ' 条有效数据');
    return results;
  }

  // 根据错误分析文本推断分类
  function detectCategory(errorNote) {
    if (!errorNote) return CATEGORIES.UNLEARNED;

    const note = errorNote.toLowerCase();

    // 拼写相关关键词
    const spellingKeywords = ['漏', '多', '字母', '拼写', '错', 'wrong', 'letter', 'missing', 'extra'];
    const hasSpellingKeyword = spellingKeywords.some(k => note.includes(k));

    if (hasSpellingKeyword) {
      return CATEGORIES.SPELLING;
    }

    return CATEGORIES.UNLEARNED;
  }

  // 导入数据
  async function importData(tsvText, options = {}) {
    const items = parseTSV(tsvText);
    if (items.length === 0) {
      return { success: false, message: '没有找到有效数据' };
    }

    const batchId = generateBatchId();
    const result = addErrorsBatch(items, batchId, options);

    // 创建批次记录
    createBatch({
      source: 'tsv_import',
      totalImported: result.added.length,
    });

    return {
      success: true,
      batchId,
      addedCount: result.added.length,
      duplicateCount: result.duplicates.length,
      duplicates: result.duplicates,
    };
  }

  // 导出数据
  function exportData() {
    const errors = getAllErrors();
    const batches = getAllBatches();

    const data = {
      _meta: {
        version: VERSION,
        exportedAt: new Date().toISOString(),
        app: 'lumos-vocab',
      },
      errors,
      batches,
    };

    return data;
  }

  // 导出为 JSON 文件下载
  function downloadExport() {
    const data = exportData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `lumos-vocab-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    localStorage.setItem(KEYS.LAST_EXPORT, Date.now().toString());

    return true;
  }

  // 清除所有数据
  function clearAll() {
    Object.values(KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // ========== 公开接口 ==========

  return {
    // 常量
    VERSION,
    CATEGORIES,
    STATUS,
    MODES,
    CONFIG,

    // 初始化
    ensureInitialized,
    isCloudMode,

    // 错题管理
    getAllErrors,
    addError,
    addErrorsBatch,
    getError,
    updateError,
    deleteError,
    getPendingErrors,
    getMasteredErrors,
    getNextPendingError,
    getRandomPendingError,
    markCorrect,
    markIncorrect,
    resetAllErrors,

    // 混淆词大作战
    getAllConfusionPairs,
    getConfusionQuestions,
    getConfusionQuestionsForPractice,
    getConfusionMasteredPairs,
    getConfusionMasteredCount,
    getConfusionTotalCount,
    markConfusionPairMastered,
    generateConfusionPairKey,
    resetConfusionMastered,
    CONFUSION_PAIRS,

    // 从零学词
    getFromZeroWords,
    getSyllableHint,

    // 训练记录
    saveTrainingRecord,
    getTrainingRecords,
    getTodayStats,
    clearTrainingRecords,

    // 批次管理
    getAllBatches,
    createBatch,
    getBatchStats,

    // 统计
    getStats,
    getWeeklyProgress,

    // 导入导出
    parseTSV,
    importData,
    exportData,
    downloadExport,
    clearAll,
  };
})();

// 兼容性别名
const StateManager = VocabStateManager;

console.log('[VocabStateManager] v' + VocabStateManager.VERSION + ' loaded');
