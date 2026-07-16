/**
 * Lumos Vocab - Cloud Storage 模块
 * 支持 Supabase 云端存储
 */

const CloudStorage = (() => {
  const CONFIG = {
    SUPABASE_URL: 'https://dmxytyvleoodvaggvkdg.supabase.co',
    SUPABASE_KEY: 'sb_publishable_KIUoi4AebdtwJDMrPeq01w_i_m7MGNz'
  };

  let _isConfigured = false;

  function init(url, key) {
    CONFIG.SUPABASE_URL = url;
    CONFIG.SUPABASE_KEY = key;
    _isConfigured = url && key && url !== '' && !url.includes('YOUR_');
    console.log('[CloudStorage] 初始化:', _isConfigured ? '已连接' : '未配置');
    return _isConfigured;
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
    const result = await request('/vocab_errors?select=*&order=id.asc');
    if (result.error) return { data: [], error: result.error };
    // 转换数据库字段为前端格式
    const errors = result.data.map(dbToError);
    return { data: errors, error: null };
  }

  async function saveErrors(errors) {
    // 先删除所有
    await request('/vocab_errors', { method: 'DELETE' });
    // 批量插入
    const dbErrors = errors.map(errorToDb);
    const result = await request('/vocab_errors', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify(dbErrors)
    });
    return result;
  }

  async function updateError(id, updates) {
    const dbUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = errorToDbKey(key);
      if (dbKey) dbUpdates[dbKey] = value;
    }
    const result = await request(`/vocab_errors?id=eq.${id}`, {
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
    createBatch
  };
})();

console.log('[CloudStorage] Module loaded');
