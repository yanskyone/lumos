/**
 * Lumos Vocab - StateManager v1.0
 * 英语词汇错题训练系统的状态管理模块
 *
 * 支持功能：
 * - 错题 CRUD 操作
 * - 训练记录管理
 * - 批次管理
 * - 线下测试记录
 * - 数据导入/导出
 */

const VocabStateManager = (() => {
  // ========== 常量 ==========
  const VERSION = '1.0';
  const PREFIX = 'lumos:vocab';

  // localStorage keys
  const KEYS = {
    ERRORS:      `${PREFIX}:errors`,
    TRAINING:    `${PREFIX}:training`,
    BATCHES:     `${PREFIX}:batches`,
    OFFLINE:     `${PREFIX}:offline`,
    SETTINGS:    `${PREFIX}:settings`,
    LAST_EXPORT: `${PREFIX}:last-export`,
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

  // 获取所有错题
  function getAllErrors() {
    return safeJsonParse(localStorage.getItem(KEYS.ERRORS), []);
  }

  // 保存所有错题
  function saveAllErrors(errors) {
    safeSetItem(KEYS.ERRORS, JSON.stringify(errors));
  }

  // 添加错题
  function addError(error) {
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
    };
    errors.push(newError);
    saveAllErrors(errors);
    return newError;
  }

  // 批量添加错题（导入时用）
  function addErrorsBatch(errorsList, batchId) {
    const errors = getAllErrors();
    const existingWords = new Set(errors.map(e => e.word.toLowerCase()));
    const batchErrors = [];
    const duplicates = [];

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

  // 获取随机待复习错题（用于训练）
  function getRandomPendingError() {
    const pending = getPendingErrors();
    if (pending.length === 0) return null;
    return pending[Math.floor(Math.random() * pending.length)];
  }

  // ========== 拼写特训营专用方法 ==========

  // 获取拼写类错题
  function getSpellingErrors() {
    const errors = getAllErrors();
    return errors.filter(e => e.category === CATEGORIES.SPELLING);
  }

  // 获取待复习的拼写类错题
  function getPendingSpellingErrors() {
    return getSpellingErrors().filter(e => e.status !== STATUS.MASTERED);
  }

  // 按关卡分组拼写错题（每关 5-10 个）
  function getSpellingLevels() {
    const pending = getPendingSpellingErrors();
    const mastered = getMasteredErrors().filter(e => e.category === CATEGORIES.SPELLING);

    const LEVEL_SIZE = 5; // 每关 5 个词

    // 计算当前关卡
    const currentLevel = Math.floor(mastered.length / LEVEL_SIZE) + 1;

    // 获取当前关卡需要练习的词
    const startIndex = mastered.length;
    const levelWords = pending.slice(startIndex, startIndex + LEVEL_SIZE);

    return {
      currentLevel,
      totalWords: getSpellingErrors().length,
      masteredCount: mastered.length,
      levelWords,      // 当前关卡的词
      isCompleted: levelWords.length === 0 && pending.length === 0, // 全部通关
      isLevelComplete: levelWords.length === 0 && pending.length > 0, // 当前关卡完成，等待下一关
    };
  }

  // 检查当前关卡是否通过（正确率 >= 80%）
  function checkLevelPass(correctCount, totalCount) {
    const passRate = totalCount > 0 ? correctCount / totalCount : 0;
    return passRate >= 0.8;
  }

  // 答对错题（更新正确次数）
  function markCorrect(id) {
    const error = getError(id);
    if (!error) return null;

    error.correctCount = (error.correctCount || 0) + 1;
    error.lastPracticedAt = new Date().toISOString();

    // 答对 3 次标记为已掌握
    if (error.correctCount >= 3) {
      error.status = STATUS.MASTERED;
    } else {
      error.status = STATUS.PRACTICING;
    }

    return updateError(id, error);
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
    const records = safeJsonParse(localStorage.getItem(KEYS.TRAINING), []);
    const newRecord = {
      id: generateId(),
      errorId: record.errorId,
      mode: record.mode || MODES.FLASH_WAR,
      date: new Date().toISOString(),
      isCorrect: record.isCorrect,
      responseTime: record.responseTime || 0,
    };
    records.push(newRecord);

    // 限制最多 100 条
    const toSave = records.slice(-100);
    safeSetItem(KEYS.TRAINING, JSON.stringify(toSave));

    return newRecord;
  }

  // 获取训练记录
  function getTrainingRecords(limit) {
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
  async function importData(tsvText) {
    const items = parseTSV(tsvText);
    if (items.length === 0) {
      return { success: false, message: '没有找到有效数据' };
    }

    const batchId = generateBatchId();
    const result = addErrorsBatch(items, batchId);

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

    // 错题管理
    getAllErrors,
    addError,
    addErrorsBatch,
    getError,
    updateError,
    deleteError,
    getPendingErrors,
    getMasteredErrors,
    getRandomPendingError,
    markCorrect,
    markIncorrect,
    resetAllErrors,

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
