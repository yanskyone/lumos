/**
 * Lumos Vocab - Supabase 客户端
 * 封装与 Supabase 的交互
 *
 * 使用方法：
 * 1. 在 Supabase 创建项目
 * 2. 获取 URL 和 anon key
 * 3. 在下方填入配置
 */

const LumosSupabase = (() => {
  // ========== 配置 - 请填入你的 Supabase 信息 ==========
  const CONFIG = {
    // 从 Supabase -> Settings -> API 获取
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
  };

  // 检查配置
  if (CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.warn('[LumosSupabase] 请先配置 Supabase URL 和 Key！');
  }

  // 创建 Supabase 客户端（内联实现，避免额外依赖）
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  // 简化的 Supabase 客户端实现
  function createClient(url, key) {
    const headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    };

    return {
      // 获取所有错题
      async getErrors() {
        if (url === 'YOUR_SUPABASE_URL') {
          console.warn('[Supabase] 未配置，跳过云端加载');
          return { data: null, error: 'not_configured' };
        }
        try {
          const res = await fetch(`${url}/rest/v1/vocab_errors?select=*&order=id.asc`, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // 转换 snake_case 为 camelCase
          return { data: data.map(transformFromDb), error: null };
        } catch (e) {
          console.error('[Supabase] 获取错题失败:', e);
          return { data: null, error: e };
        }
      },

      // 保存错题列表
      async saveErrors(errors) {
        if (url === 'YOUR_SUPABASE_URL') return { error: 'not_configured' };
        try {
          // 先清空旧数据
          await fetch(`${url}/rest/v1/vocab_errors`, {
            method: 'DELETE',
            headers
          });
          // 批量插入新数据
          const dbErrors = errors.map(transformToDb);
          const res = await fetch(`${url}/rest/v1/vocab_errors`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify(dbErrors)
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return { error: null };
        } catch (e) {
          console.error('[Supabase] 保存错题失败:', e);
          return { error: e };
        }
      },

      // 获取训练记录
      async getTrainingRecords(limit = 100) {
        if (url === 'YOUR_SUPABASE_URL') return { data: [], error: null };
        try {
          const res = await fetch(
            `${url}/rest/v1/vocab_training?select=*&order=date.desc&limit=${limit}`,
            { headers }
          );
          const data = await res.json();
          return { data: data.map(transformTrainingFromDb), error: null };
        } catch (e) {
          return { data: [], error: e };
        }
      },

      // 保存训练记录
      async saveTrainingRecord(record) {
        if (url === 'YOUR_SUPABASE_URL') return { error: 'not_configured' };
        try {
          const res = await fetch(`${url}/rest/v1/vocab_training`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify(transformTrainingToDb(record))
          });
          return { error: res.ok ? null : new Error(`HTTP ${res.status}`) };
        } catch (e) {
          return { error: e };
        }
      },

      // 更新错题状态
      async updateError(id, updates) {
        if (url === 'YOUR_SUPABASE_URL') return { error: 'not_configured' };
        try {
          const res = await fetch(`${url}/rest/v1/vocab_errors?id=eq.${id}`, {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify(updates)
          });
          return { error: res.ok ? null : new Error(`HTTP ${res.status}`) };
        } catch (e) {
          return { error: e };
        }
      },

      // 获取统计
      async getStats() {
        if (url === 'YOUR_SUPABASE_URL') return { data: null, error: null };
        try {
          const [totalRes, masteredRes] = await Promise.all([
            fetch(`${url}/rest/v1/vocab_errors?select=id`, { headers }),
            fetch(`${url}/rest/v1/vocab_errors?status=eq.mastered&select=id`, { headers })
          ]);
          const total = (await totalRes.json()).length;
          const mastered = (await masteredRes.json()).length;
          return {
            data: { total, mastered, pending: total - mastered },
            error: null
          };
        } catch (e) {
          return { data: null, error: e };
        }
      },

      // 获取批次
      async getBatches() {
        if (url === 'YOUR_SUPABASE_URL') return { data: [], error: null };
        try {
          const res = await fetch(`${url}/rest/v1/vocab_batches?select=*&order=created_at.desc`, { headers });
          const data = await res.json();
          return { data, error: null };
        } catch (e) {
          return { data: [], error: e };
        }
      },

      // 创建批次
      async createBatch(batch) {
        if (url === 'YOUR_SUPABASE_URL') return { error: 'not_configured' };
        try {
          const res = await fetch(`${url}/rest/v1/vocab_batches`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify(batch)
          });
          return { error: res.ok ? null : new Error(`HTTP ${res.status}`) };
        } catch (e) {
          return { error: e };
        }
      },

      // 检查连接
      async ping() {
        if (url === 'YOUR_SUPABASE_URL') return false;
        try {
          const res = await fetch(`${url}/rest/v1/vocab_errors?select=id&limit=1`, { headers });
          return res.ok;
        } catch {
          return false;
        }
      }
    };
  }

  // 数据库字段转换（snake_case <-> camelCase）
  function transformToDb(error) {
    return {
      id: error.id,
      word: error.word,
      phonetic: error.phonetic || '',
      meaning: error.meaning,
      category: error.category || 'unlearned',
      wrong_answer: error.wrongAnswer || '',
      error_note: error.errorNote || '',
      tip: error.tip || '',
      unit: error.unit || '',
      status: error.status || 'pending',
      mastered_modes: error.masteredModes || [],
      confused_with: error.confusedWith || [],
      correct_count: error.correctCount || 0,
      created_at: error.createdAt || new Date().toISOString(),
      last_practiced_at: error.lastPracticedAt || null,
      batch_id: error.batchId || ''
    };
  }

  function transformFromDb(dbError) {
    return {
      id: dbError.id,
      word: dbError.word,
      phonetic: dbError.phonetic || '',
      meaning: dbError.meaning,
      category: dbError.category || 'unlearned',
      wrongAnswer: dbError.wrong_answer || '',
      errorNote: dbError.error_note || '',
      tip: dbError.tip || '',
      unit: dbError.unit || '',
      status: dbError.status || 'pending',
      masteredModes: dbError.mastered_modes || [],
      confusedWith: dbError.confused_with || [],
      correctCount: dbError.correct_count || 0,
      createdAt: dbError.created_at || null,
      lastPracticedAt: dbError.last_practiced_at || null,
      batchId: dbError.batch_id || ''
    };
  }

  function transformTrainingToDb(record) {
    return {
      id: record.id,
      error_id: record.errorId || '',
      mode: record.mode,
      date: record.date || new Date().toISOString(),
      is_correct: record.isCorrect,
      response_time: record.responseTime || 0
    };
  }

  function transformTrainingFromDb(dbRecord) {
    return {
      id: dbRecord.id,
      errorId: dbRecord.error_id,
      mode: dbRecord.mode,
      date: dbRecord.date,
      isCorrect: dbRecord.is_correct,
      responseTime: dbRecord.response_time
    };
  }

  return supabase;
})();

console.log('[LumosSupabase] Client loaded');
