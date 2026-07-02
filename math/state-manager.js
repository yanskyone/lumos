// web/state-manager.js
// StateManager —— 状态抽象层（第一轮增强版）
// 所有业务代码通过本模块访问持久化存储，
// 未来切换云端实现时只需替换本文件，业务代码零改动。

const StateManager = (() => {
  // ========== 常量 ==========
  const VERSION = 1;

  // localStorage key（保持现有 key 名，向后兼容）
  const KEYS = {
    USER_ID:     'lumos-user-id',
    MASTERY:     'learning-map-mastery',
    WEAK:        'learning-map-weak',
    PRACTICE:    'learning-map-practice',
    WRONG:       'learning-map-wrong',
    EVENTS:      'learning-map-events',
    LAST_EXPORT: 'lumos-last-export',
    PRACTICE_HISTORY: 'lumos-practice-history',  // 新增：练习历史记录
  };

  // error_type 枚举（内部用英文，显示时映射）
  const ERROR_TYPES = {
    CONCEPT:             'concept_error',
    CALCULATION:         'calculation_error',
    CARELESS:            'careless_error',
    METHOD:              'method_error',
    APPLICATION_CONTEXT:  'application_context_error',
  };

  // error_type → 中文显示映射
  const ERROR_TYPE_ZH = {
    'concept_error':             '概念理解错误',
    'calculation_error':         '计算错误',
    'careless_error':           '粗心错误',
    'method_error':              '方法选择错误',
    'application_context_error': '适用场景错误',
  };

  // ========== 内部工具函数 ==========

  // 安全 JSON.parse：解析失败返回 defaultValue，不抛异常
  function safeJsonParse(raw, defaultValue) {
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[StateManager] JSON.parse 失败，使用默认值：', e);
      return defaultValue;
    }
  }

  // 安全 localStorage.setItem：捕获 QuotaExceededError，
  // 触发日志清理，降级时调用 showStorageFullToast
  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      const isQuotaError =
        e.name === 'QuotaExceededError' ||
        (e.code !== undefined && e.code === 22);
      if (isQuotaError) {
        console.warn('[StateManager] localStorage 配额已满，尝试清理事件日志...');
        try {
          const events = safeJsonParse(localStorage.getItem(KEYS.EVENTS), []);
          if (events.length > 200) {
            events.splice(0, events.length - 200);
            localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
            // 清理后重试
            localStorage.setItem(key, value);
            return;
          }
        } catch (e2) { /* 清理失败，降级处理 */ }
        showStorageFullToast();
      }
      throw e; // 非配额错误直接抛出
    }
  }

  // 存储空间不足时，非阻塞 Toast 提示（通过 window.showToast 中转）
  function showStorageFullToast() {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast('存储空间即将满，建议导出数据');
      }
    } catch (e) { /* 静默失败 */ }
  }

  // 生成唯一 eventId（时间戳 + 随机串）
  function generateEventId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  // 生成用户 ID（简化 UUID v4）
  function generateUserId() {
    return 'user-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  // 获取或创建用户 ID
  function getOrCreateUserId() {
    let userId = localStorage.getItem(KEYS.USER_ID);
    if (!userId) {
      userId = generateUserId();
      localStorage.setItem(KEYS.USER_ID, userId);
      console.log('[StateManager] 新用户初始化，ID：', userId);
    }
    return userId;
  }

  // ========== 公开接口（全部返回 Promise，便于未来切换异步实现）==========

  return {

    // --- 常量 / 枚举（只读） ---
    VERSION,
    ERROR_TYPES,
    ERROR_TYPE_ZH,

    // --- 用户 ID 管理 ---
    getUserId() {
      return getOrCreateUserId();
    },

    // --- 导出 / 导入（增强版：包含元数据） ---
    async exportAll() {
      const userId = getOrCreateUserId();
      const exportDate = new Date().toISOString();
      const data = {
        _meta: {
          userId,
          exportDate,
          version: VERSION,
          app: 'lumos',
        },
        mastery:  localStorage.getItem(KEYS.MASTERY),
        weak:     localStorage.getItem(KEYS.WEAK),
        practice: localStorage.getItem(KEYS.PRACTICE),
        wrong:    localStorage.getItem(KEYS.WRONG),
        events:   localStorage.getItem(KEYS.EVENTS),
      };
      // 更新最后导出时间
      localStorage.setItem(KEYS.LAST_EXPORT, Date.now().toString());
      return data;
    },

    // 导入数据（支持新格式和旧格式）
    async importAll(data) {
      // 检测是否为新格式（包含 _meta）
      if (data._meta) {
        // 新格式：直接导入各字段
        if (data.mastery  !== undefined) safeSetItem(KEYS.MASTERY,  data.mastery);
        if (data.weak    !== undefined) safeSetItem(KEYS.WEAK,     data.weak);
        if (data.practice !== undefined) safeSetItem(KEYS.PRACTICE, data.practice);
        if (data.wrong   !== undefined) safeSetItem(KEYS.WRONG,    data.wrong);
        if (data.events  !== undefined) safeSetItem(KEYS.EVENTS,   data.events);
      } else {
        // 旧格式（向后兼容）：直接导入
        if (data.mastery  !== undefined) safeSetItem(KEYS.MASTERY,  data.mastery);
        if (data.weak    !== undefined) safeSetItem(KEYS.WEAK,     data.weak);
        if (data.practice !== undefined) safeSetItem(KEYS.PRACTICE, data.practice);
        if (data.wrong   !== undefined) safeSetItem(KEYS.WRONG,    data.wrong);
        if (data.events  !== undefined) safeSetItem(KEYS.EVENTS,   data.events);
      }
      // 更新最后导出时间（导入后重置）
      localStorage.setItem(KEYS.LAST_EXPORT, Date.now().toString());
    },

    // 获取最后导出时间（用于自动提醒）
    async getLastExportTime() {
      const timestamp = localStorage.getItem(KEYS.LAST_EXPORT);
      return timestamp ? parseInt(timestamp, 10) : null;
    },

    // 检查是否需要提醒导出（超过 7 天）
    async shouldRemindExport() {
      const lastExport = await this.getLastExportTime();
      if (!lastExport) return true; // 从未导出过，提醒
      const daysSinceExport = (Date.now() - lastExport) / (1000 * 60 * 60 * 24);
      return daysSinceExport >= 7;
    },

    // ========== 选择性重置（为 v0.5 预留）==========

    // 只重置掌握状态
    async clearMastery() {
      localStorage.removeItem(KEYS.MASTERY);
    },

    // 只重置薄弱点
    async clearWeakPoints() {
      localStorage.removeItem(KEYS.WEAK);
    },

    // 只重置练习进度
    async clearPractice() {
      localStorage.removeItem(KEYS.PRACTICE);
    },

    // 只重置错题记录
    async clearWrongQuestions() {
      localStorage.removeItem(KEYS.WRONG);
    },

    // 只重置事件日志
    async clearEvents() {
      localStorage.removeItem(KEYS.EVENTS);
    },

    // 重置所有数据（保持现有行为）
    async clearAll() {
      localStorage.removeItem(KEYS.MASTERY);
      localStorage.removeItem(KEYS.WEAK);
      localStorage.removeItem(KEYS.PRACTICE);
      localStorage.removeItem(KEYS.WRONG);
      localStorage.removeItem(KEYS.EVENTS);
      // 注意：不清除 USER_ID 和 LAST_EXPORT（用户身份和导出记录保留）
    },

    // ========== 掌握状态 ==========

    async getAllMastery() {
      return safeJsonParse(localStorage.getItem(KEYS.MASTERY), {});
    },

    async saveAllMastery(data) {
      safeSetItem(KEYS.MASTERY, JSON.stringify(data));
    },

    async getMastery(knowledgeId) {
      const data = safeJsonParse(localStorage.getItem(KEYS.MASTERY), {});
      return data[knowledgeId] || 'unlearned';
    },

    async setMastery(knowledgeId, status) {
      const data = safeJsonParse(localStorage.getItem(KEYS.MASTERY), {});
      data[knowledgeId] = status;
      safeSetItem(KEYS.MASTERY, JSON.stringify(data));
    },

    // ========== 薄弱点 ==========

    async getWeakPoints() {
      return safeJsonParse(localStorage.getItem(KEYS.WEAK), []);
    },

    async saveAllWeak(data) {
      safeSetItem(KEYS.WEAK, JSON.stringify(data));
    },

    // ========== 练习进度（为 Phase 1 留口子） ==========

    async getPracticeProgress(knowledgeId) {
      const data = safeJsonParse(localStorage.getItem(KEYS.PRACTICE), {});
      return data[knowledgeId] || null;
    },

    async setPracticeProgress(knowledgeId, progress) {
      const data = safeJsonParse(localStorage.getItem(KEYS.PRACTICE), {});
      data[knowledgeId] = progress;
      safeSetItem(KEYS.PRACTICE, JSON.stringify(data));
    },

    // ========== 错题记录（为 Phase 1 留口子） ==========

    async addWrongQuestion(knowledgeId, errorType) {
      const data = safeJsonParse(localStorage.getItem(KEYS.WRONG), []);
      data.push({
        knowledgeId,
        errorType: errorType || ERROR_TYPES.CONCEPT,
        timestamp: Date.now(),
        eventId: generateEventId(),
      });
      safeSetItem(KEYS.WRONG, JSON.stringify(data));
    },

    async getWrongQuestions() {
      return safeJsonParse(localStorage.getItem(KEYS.WRONG), []);
    },

    // ========== 练习历史记录（新功能）==========
    
    // 保存练习记录
    async savePracticeHistory(record) {
      const history = safeJsonParse(localStorage.getItem(KEYS.PRACTICE_HISTORY), []);
      record.recordId = generateEventId();
      record.timestamp = Date.now();
      history.push(record);
      // 限制最多保存 100 条记录
      const toSave = history.slice(-100);
      safeSetItem(KEYS.PRACTICE_HISTORY, JSON.stringify(toSave));
      return record.recordId;
    },

    // 获取所有练习历史记录
    async getPracticeHistory() {
      return safeJsonParse(localStorage.getItem(KEYS.PRACTICE_HISTORY), []);
    },

    // 获取指定知识点的练习历史
    async getPracticeHistoryByKnowledge(knowledgeId) {
      const history = safeJsonParse(localStorage.getItem(KEYS.PRACTICE_HISTORY), []);
      return history.filter(record => record.knowledgeId === knowledgeId);
    },

    // 清除所有练习历史
    async clearPracticeHistory() {
      localStorage.removeItem(KEYS.PRACTICE_HISTORY);
    },

    // ========== 学习事件记录（为 Learning Analytics 留口子）==========
    // 增强：增加内存管理钩子（codeG 建议）
    async logEvent(eventType, payload) {
      const events = safeJsonParse(localStorage.getItem(KEYS.EVENTS), []);
      const now = Date.now();
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      
      // 分离 archived 和 active 事件（不修改原数组对象，避免副作用）
      const archivedEvents = events.filter(evt => 
        evt.timestamp && (now - evt.timestamp) > THIRTY_DAYS
      );
      const activeEvents = events.filter(evt => 
        !(evt.timestamp && (now - evt.timestamp) > THIRTY_DAYS)
      );

      // 添加新事件
      activeEvents.push({
        eventId:   generateEventId(),
        eventType,
        payload,
        timestamp: now,
        _v: VERSION,
      });

      // 限制总数（active + archived）不超过 1000 条
      const allEvents = activeEvents.concat(archivedEvents);
      const toSave = allEvents.slice(-1000);
      safeSetItem(KEYS.EVENTS, JSON.stringify(toSave));
    },

    async getEventStats() {
      const events = safeJsonParse(localStorage.getItem(KEYS.EVENTS), []);
      const activeEvents = events.filter(e => !e._archived);
      return {
        total:       events.length,
        active:       activeEvents.length,
        archived:     events.filter(e => e._archived).length,
        oldest:       events.length > 0 ? events[0].timestamp : null,
        newest:       events.length > 0 ? events[events.length - 1].timestamp : null,
      };
    },

    // ========== 云端钩子预留（第二轮实现，当前只占位） ==========
    // TODO (Cloud #1 — 冲突解决): setMastery / addWrongQuestion 需增加
    //       时间戳或版本号校验点，冲突时暂停写入并提示用户。
    // TODO (Cloud #2 — 离线队列): 写入失败时存入 PendingWrites 队列，
    //       网络恢复后自动重试。
    // TODO (Cloud #3 — 幂等性): 所有写入操作需支持幂等，
    //       重复调用不产生副作用（当前 localStorage 天然幂等，云端需显式处理）。

  };
})();
