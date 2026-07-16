/**
 * Lumos Vocab - Cloud Storage 模块
 * 支持 Supabase 云端存储 + 用户追踪
 */

const CloudStorage = (() => {
  const CONFIG = {
    SUPABASE_URL: 'https://dmxytyvleoodvaggvkdg.supabase.co',
    SUPABASE_KEY: 'sb_publishable_KIUoi4AebdtwJDMrPeq01w_i_m7MGNz'
  };

  let _isConfigured = false;
  let _userId = null;

  function init(url, key) {
    CONFIG.SUPABASE_URL = url;
    CONFIG.SUPABASE_KEY = key;
    _isConfigured = url && key && url !== '' && !url.includes('YOUR_');

    // 生成或获取用户ID
    _userId = getUserId();

    console.log('[CloudStorage] 初始化:', _isConfigured ? '已连接' : '未配置');
    console.log('[CloudStorage] 用户ID:', _userId);
    return _isConfigured;
  }

  // 生成或获取用户ID（只包含安全的URL字符）
  function getUserId() {
    const STORAGE_KEY = 'lumos:vocab:user-id';
    let userId = localStorage.getItem(STORAGE_KEY);

    if (!userId) {
      // 生成新的匿名ID（只包含字母数字）
      userId = 'u' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(STORAGE_KEY, userId);
      console.log('[CloudStorage] 生成新用户ID:', userId);
    }

    return userId;
  }

  function getCurrentUserId() {
    return _userId;
  }

  function isConfigured() {
    return _isConfigured;
  }

  async function request(path, options = {}) {
    if (!_isConfigured) {
      return { data: null, error: new Error('Cloud not configured') };
    }

    const url = CONFIG.SUPABASE_URL + '/rest/v1' + path;
    const headers = {
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        return { data: null, error: new Error(data.message || `HTTP ${res.status}`) };
      }
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }

  // ========== API 方法 ==========

  async function getErrors() {
    // 按用户ID获取数据
    const userId = encodeURIComponent(_userId);
    const result = await request(`/vocab_errors?user_id=eq.${userId}&select=*&order=id.asc`);
    if (result.error) return { data: [], error: result.error };
    // 转换数据库字段为前端格式
    const errors = result.data.map(dbToError);
    return { data: errors, error: null };
  }

  async function saveErrors(errors) {
    // 先删除当前用户的数据
    const userId = encodeURIComponent(_userId);
    await request(`/vocab_errors?user_id=eq.${userId}`, { method: 'DELETE' });

    // 为每条数据添加用户ID后逐条插入（避免批量冲突）
    const dbErrors = errors.map((e, i) => {
      const error = errorToDb(e);
      error.user_id = _userId;
      error.id = _userId + '-' + e.id;  // 确保ID唯一
      return error;
    });

    // 分批插入，每批10条
    const batchSize = 10;
    for (let i = 0; i < dbErrors.length; i += batchSize) {
      const batch = dbErrors.slice(i, i + batchSize);
      await request('/vocab_errors', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(batch)
      });
    }

    console.log('[CloudStorage] 已保存 ' + dbErrors.length + ' 条错题');
    return { error: null };
  }

  async function updateError(id, updates) {
    const dbUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = errorToDbKey(key);
      if (dbKey) dbUpdates[dbKey] = value;
    }
    // 确保更新属于当前用户
    const userId = encodeURIComponent(_userId);
    dbUpdates.user_id = _userId;
    const result = await request(`/vocab_errors?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(dbUpdates)
    });
    return result;
  }

  async function getTrainingRecords(limit = 100) {
    const result = await request(`/vocab_training?select=*&order=date.desc&limit=${limit}`);
    if (result.error) return { data: [], error: result.error };
    const records = result.data.map(dbToTraining);
    return { data: records, error: null };
  }

  async function saveTrainingRecord(record) {
    const dbRecord = trainingToDb(record);
    dbRecord.user_id = _userId;  // 添加用户ID
    const result = await request('/vocab_training', {
      method: 'POST',
      body: JSON.stringify([dbRecord])
    });
    return result;
  }

  async function getBatches() {
    const result = await request('/vocab_batches?select=*&order=created_at.desc');
    if (result.error) return { data: [], error: result.error };
    return { data: result.data, error: null };
  }

  async function createBatch(batch) {
    const result = await request('/vocab_batches', {
      method: 'POST',
      body: JSON.stringify([batch])
    });
    return result;
  }

  async function ping() {
    if (!_isConfigured) return false;
    const result = await request('/vocab_errors?select=id&limit=1');
    return !result.error;
  }

  // ========== 字段转换 ==========

  function errorToDb(e) {
    return {
      id: e.id,
      word: e.word,
      phonetic: e.phonetic || '',
      meaning: e.meaning,
      category: e.category || 'unlearned',
      wrong_answer: e.wrongAnswer || '',
      error_note: e.errorNote || '',
      tip: e.tip || '',
      unit: e.unit || '',
      status: e.status || 'pending',
      mastered_modes: e.masteredModes || [],
      confused_with: e.confusedWith || [],
      correct_count: e.correctCount || 0,
      created_at: e.createdAt || new Date().toISOString(),
      last_practiced_at: e.lastPracticedAt || null,
      batch_id: e.batchId || ''
    };
  }

  function dbToError(db) {
    return {
      id: db.id,
      word: db.word,
      phonetic: db.phonetic || '',
      meaning: db.meaning,
      category: db.category || 'unlearned',
      wrongAnswer: db.wrong_answer || '',
      errorNote: db.error_note || '',
      tip: db.tip || '',
      unit: db.unit || '',
      status: db.status || 'pending',
      masteredModes: db.mastered_modes || [],
      confusedWith: db.confused_with || [],
      correctCount: db.correct_count || 0,
      createdAt: db.created_at || null,
      lastPracticedAt: db.last_practiced_at || null,
      batchId: db.batch_id || ''
    };
  }

  function errorToDbKey(key) {
    const map = {
      'wrongAnswer': 'wrong_answer',
      'errorNote': 'error_note',
      'masteredModes': 'mastered_modes',
      'confusedWith': 'confused_with',
      'correctCount': 'correct_count',
      'createdAt': 'created_at',
      'lastPracticedAt': 'last_practiced_at',
      'batchId': 'batch_id'
    };
    return map[key] || null;
  }

  function trainingToDb(r) {
    return {
      id: r.id,
      error_id: r.errorId || '',
      mode: r.mode,
      date: r.date || new Date().toISOString(),
      is_correct: r.isCorrect,
      response_time: r.responseTime || 0
    };
  }

  function dbToTraining(db) {
    return {
      id: db.id,
      errorId: db.error_id,
      mode: db.mode,
      date: db.date,
      isCorrect: db.is_correct,
      responseTime: db.response_time
    };
  }

  return {
    init,
    isConfigured,
    ping,
    getErrors,
    saveErrors,
    updateError,
    getTrainingRecords,
    saveTrainingRecord,
    getBatches,
    createBatch,
    getCurrentUserId
  };
})();

console.log('[CloudStorage] Module loaded');
