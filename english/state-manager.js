/**
 * StateManager - 英语模块简化版
 * 只实现英语模块需要的方法
 */

const StateManager = {
  // 命名空间前缀（避免与数学模块冲突）
  PREFIX: 'lumos:english',

  /**
   * 获取掌握状态
   * @param {string} scenarioId - 场景ID
   * @returns {Promise<Object|null>}
   */
  async getMastery(scenarioId) {
    try {
      const key = `${this.PREFIX}:mastery:${scenarioId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[StateManager] getMastery failed:', e);
      return null;
    }
  },

  /**
   * 设置掌握状态
   * @param {string} scenarioId - 场景ID
   * @param {string} status - 状态（'mastered'|'learning'|'new'）
   * @returns {Promise<void>}
   */
  async setMastery(scenarioId, status) {
    try {
      const key = `${this.PREFIX}:mastery:${scenarioId}`;
      const data = {
        status: status,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('[StateManager] setMastery failed:', e);
    }
  },

  /**
   * 获取所有掌握状态
   * @returns {Promise<Object>}
   */
  async getAllMastery() {
    try {
      const prefix = `${this.PREFIX}:mastery:`;
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          const scenarioId = key.replace(prefix, '');
          const data = JSON.parse(localStorage.getItem(key));
          result[scenarioId] = data;
        }
      }
      return result;
    } catch (e) {
      console.error('[StateManager] getAllMastery failed:', e);
      return {};
    }
  }
};

console.log('[StateManager] English module loaded');
