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

  // 混合模式配置
  const MIXED_MODE = {
    canCreatePublic: true,  // 用户是否可以创建公共错题
    showPublicByDefault: true  // 默认是否显示公共错题
  };

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

  // 从 vocab_public 表获取公共错题
  async function getPublicErrors() {
    console.log('[CloudStorage] >>> 开始获取公共错题...');
    // 移除 is_active 过滤，直接获取所有数据
    const result = await request('/vocab_public?select=*&order=word.asc');
    if (result.error) {
      console.error('[CloudStorage] 获取公共错题失败:', result.error);
      return { data: [], error: result.error };
    }
    console.log('[CloudStorage] >>> vocab_public 返回 ' + result.data.length + ' 条数据');
    return { data: result.data.map(dbToPublicError), error: null };
  }

  async function getErrors(options = {}) {
    console.log('[CloudStorage] === getErrors 开始 ===');
    const userId = encodeURIComponent(_userId);
    const plainUserId = _userId;

    try {
      // 获取用户私有错题
      const privateResult = await request(`/vocab_errors?owner_id=eq.${userId}&select=*&order=created_at.desc`);

      if (privateResult.error) {
        console.error('[CloudStorage] 获取私有错题失败:', privateResult.error);
        return { data: [], error: privateResult.error };
      }

      const privateErrors = privateResult.data || [];
      console.log('[CloudStorage] 用户私有错题:', privateErrors.length, '条');

      // 转换字段
      const convertedErrors = privateErrors.map(e => dbToError(e));
      console.log('[CloudStorage] === 返回 ' + convertedErrors.length + ' 条错题 ===');

      return { data: convertedErrors, error: null };
    } catch (e) {
      console.error('[CloudStorage] 获取错题失败:', e);
      return { data: [], error: e };
    }
  }

  /**
   * 保存用户错题到云端（完整替换模式）
   * 先删除用户的所有旧错题，再插入新数据
   */
  async function saveErrors(errors, options = {}) {
    const userId = encodeURIComponent(_userId);
    const plainUserId = _userId;

    console.log('[CloudStorage] 开始保存 ' + errors.length + ' 条错题到云端...');

    try {
      // 1. 先删除用户的所有旧错题
      await request(`/vocab_errors?owner_id=eq.${userId}`, { method: 'DELETE' });

      if (errors.length === 0) {
        console.log('[CloudStorage] 没有数据需要保存');
        return { error: null };
      }

      // 2. 转换并添加必要字段
      const dbErrors = errors.map((e) => {
        const error = errorToDb(e);
        error.owner_id = plainUserId;
        error.share_type = 'private';
        error.id = plainUserId + '-' + e.id;
        return error;
      });

      // 3. 分批插入
      const batchSize = 50;
      for (let i = 0; i < dbErrors.length; i += batchSize) {
        const batch = dbErrors.slice(i, i + batchSize);
        const result = await request('/vocab_errors', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify(batch)
        });

        if (result.error) {
          console.error('[CloudStorage] 批量插入失败:', result.error);
          return { error: result.error };
        }
      }

      console.log('[CloudStorage] 已保存 ' + dbErrors.length + ' 条错题到云端');
      return { error: null };

    } catch (e) {
      console.error('[CloudStorage] 保存失败:', e);
      return { error: e };
    }
  }

  // 创建公共错题（供管理员或所有用户使用）
  async function createPublicError(error) {
    const dbError = errorToDb(error);
    dbError.owner_id = _userId;
    dbError.share_type = 'public';
    dbError.id = 'public-' + error.id + '-' + Date.now();

    const result = await request('/vocab_errors', {
      method: 'POST',
      body: JSON.stringify([dbError])
    });

    if (!result.error) {
      console.log('[CloudStorage] 已创建公共错题:', dbError.id);
    }
    return result;
  }

  // 删除错题（私有错题可删除，公共错题需确认）
  async function deleteError(id, options = {}) {
    const error = options.error || {};
    const userId = encodeURIComponent(_userId);

    // 私有错题：仅创建者可删除
    if (error.visibility === 'private') {
      return await request(`/vocab_errors?id=eq.${id}&owner_id=eq.${userId}`, { method: 'DELETE' });
    }

    // 公共错题：需要 isPublicDelete 选项才能删除
    if (options.allowPublicDelete) {
      return await request(`/vocab_errors?id=eq.${id}`, { method: 'DELETE' });
    }

    return { error: new Error('Cannot delete public errors without confirmation') };
  }

  async function updateError(id, updates, options = {}) {
    const dbUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = errorToDbKey(key);
      if (dbKey) dbUpdates[dbKey] = value;
    }

    // 更新用户私有表中的错题
    const result = await request(`/vocab_errors?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dbUpdates)
    });

    if (result.error) {
      console.error('[CloudStorage] 更新错题失败:', result.error);
    }

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
      batch_id: e.batchId || '',
      // 混合模式新增字段
      visibility: e.visibility || 'private',
      owner_id: e.ownerId || _userId,
      user_id: e.userId || _userId // 保留兼容
    };
  }

  // 转换 vocab_public 表数据为前端格式
  function dbToPublicError(db) {
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
      batchId: db.batch_id || '',
      // 公共错题标识
      isPublic: true,
      visibility: 'public',
      source: db.source || 'system'
    };
  }

  // 转换 vocab_errors 表数据为前端格式
  function dbToError(db) {
    // 如果是公共错题格式，使用公共转换函数
    if (db.is_public || db.source === 'migrated') {
      return dbToPublicError(db);
    }

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
      batchId: db.batch_id || '',
      // 混合模式新增字段
      isPublic: db.isPublic || false,
      visibility: db.share_type || db.visibility || 'private',
      ownerId: db.owner_id || db.user_id || null,
      isOwner: (db.owner_id || db.user_id) === _userId
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
      'batchId': 'batch_id',
      'visibility': 'share_type',
      'ownerId': 'owner_id'
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
    getPublicErrors,
    saveErrors,
    updateError,
    deleteError,
    createPublicError,
    getTrainingRecords,
    saveTrainingRecord,
    getBatches,
    createBatch,
    getCurrentUserId,
    MIXED_MODE
  };
})();

console.log('[CloudStorage] Module loaded');
