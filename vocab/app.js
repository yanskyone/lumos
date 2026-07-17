/**
 * Lumos Vocab - 应用主逻辑
 * 重构版：从 index.html 抽取所有业务逻辑
 * 版本: 3.2 - 移除拼写特训营，聚焦混淆词训练
 */

console.log('[app.js] v3.2 loaded - 移除拼写特训营');

// ========== 状态 ==========
const state = {
  currentView: 'main',
  currentFilter: 'all',
  currentVisibility: 'all',
  importVisibility: 'private',
  initialized: false,
  training: {
    active: false,
    mode: null,
    startTime: null,
    timerInterval: null,
    sessionCorrect: 0,
    sessionTotal: 0,
    currentError: null,
    correctWordIds: [],
    // 混淆词大作战专用
    confusionQuestions: [],
    confusionIndex: 0,
    confusionTotal: 0,
    confusionMastered: 0,
    showConfusedWord: false,
    currentConfusionPair: null,
  },
};

// ========== 鼓励式反馈语料库 ==========
const FEEDBACKS = {
  correct: [
    "🌟 你又认识一个词！加油！",
    "💪 和这个词已经成为朋友啦！",
    "🎉 继续加油！",
    "✨ 太棒了！",
    "🌈 你真厉害！",
  ],
  wrong: [
    "😊 没关系，下次记住就好~",
    "🤔 这个词确实有点难呢~",
    "🌸 加油，我们一起慢慢来~",
    "💝 没关系，再试一次~",
  ],
  mastered: [
    "🎊 又掌握了一个词！你真棒！",
    "🏆 已经成为好朋友啦！",
    "🌟 词汇量在悄悄变多~",
    "🎉 太厉害了！又学会一个！",
  ],
};

// ========== DOM 元素缓存 ==========
const $ = (id) => document.getElementById(id);

const elements = {
  // Views
  mainView: $('main-view'),
  listView: $('list-view'),
  importView: $('import-view'),
  trainingView: $('training-view'),
  completionView: $('completion-view'),

  // Main View
  statTotal: $('stat-total'),
  statMastered: $('stat-mastered'),
  statPending: $('stat-pending'),
  progressPercent: $('progress-percent'),
  progressFill: $('progress-fill'),
  todayTotal: $('today-total'),
  todayAccuracy: $('today-accuracy'),
  weeklyCount: $('weekly-count'),
  btnStartTraining: $('btn-start-training'),
  trainingModeSelect: $('training-mode-select'),

  // List View
  errorList: $('error-list'),
  errorListEmpty: $('error-list-empty'),

  // Import View
  importTextarea: $('import-textarea'),
  importedCount: $('imported-count'),
  importedBatches: $('imported-batches'),

  // Training View
  trainingTimer: $('training-timer'),
  trainingProgress: $('training-progress'),
  wordMeaning: $('word-meaning'),
  wordPhonetic: $('word-phonetic'),
  answerInput: $('answer-input'),
  btnSubmitAnswer: $('btn-submit-answer'),
  feedbackArea: $('feedback-area'),
  confusionOptionsArea: $('confusion-options-area'),

  // Modal
  timeLimitModal: $('time-limit-modal'),

  // Toast
  toast: $('toast'),
};

// ========== 工具函数 ==========
function getRandomFeedback(type) {
  const pool = FEEDBACKS[type] || FEEDBACKS.correct;
  return pool[Math.floor(Math.random() * pool.length)];
}

function normalizeWord(s) {
  return s.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/['']/g, '');
}

function showToast(message, duration = 2000) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), duration);
}

// ========== 视图切换 ==========
function showView(view) {
  // 隐藏所有视图
  elements.mainView.classList.add('hidden');
  elements.listView.classList.add('hidden');
  elements.importView.classList.add('hidden');
  elements.trainingView.classList.add('hidden');
  elements.completionView.classList.add('hidden');

  // 显示目标视图
  const viewEl = $(view + '-view');
  if (viewEl) viewEl.classList.remove('hidden');

  state.currentView = view;

  // 隐藏训练模式选择
  hideTrainingModeSelect();

  // 清理训练特殊UI
  cleanupTrainingUI();

  // 刷新视图数据
  if (view === 'main') {
    updateMainStats();
  } else if (view === 'list') {
    renderErrorList();
  } else if (view === 'import') {
    updateImportStats();
  }
}

// ========== 训练模式选择 ==========
function showTrainingModeSelect() {
  const stats = VocabStateManager.getStats();
  if (stats.total === 0) {
    showView('import');
    return;
  }
  if (stats.pending + stats.practicing === 0) {
    showToast('太棒了！所有词汇都已掌握~');
    return;
  }
  elements.trainingModeSelect.classList.remove('hidden');
}

function hideTrainingModeSelect() {
  elements.trainingModeSelect.classList.add('hidden');
}

// ========== 主页统计更新 ==========
function updateMainStats() {
  const stats = VocabStateManager.getStats();
  const weekly = VocabStateManager.getWeeklyProgress();
  const today = VocabStateManager.getTodayStats();

  console.log('[updateMainStats] stats:', stats);

  elements.statTotal.textContent = stats.total;
  elements.statMastered.textContent = stats.mastered;
  elements.statPending.textContent = stats.pending + stats.practicing;

  const progress = stats.total > 0 ? Math.round(stats.mastered / stats.total * 100) : 0;
  elements.progressPercent.textContent = progress + '%';
  elements.progressFill.style.width = progress + '%';

  elements.todayTotal.textContent = today.total;
  elements.todayAccuracy.textContent = today.accuracy + '%';
  elements.weeklyCount.textContent = weekly.masteredThisWeek;

  // 更新开始训练按钮状态
  if (stats.total === 0) {
    elements.btnStartTraining.textContent = '📥 先导入错题';
    elements.btnStartTraining.disabled = true;
    elements.btnStartTraining.style.opacity = '0.6';
  } else if (stats.pending + stats.practicing === 0) {
    elements.btnStartTraining.textContent = '🎉 全部掌握！';
    elements.btnStartTraining.disabled = true;
    elements.btnStartTraining.style.opacity = '0.6';
  } else {
    elements.btnStartTraining.textContent = '⚡ 开始训练';
    elements.btnStartTraining.disabled = false;
    elements.btnStartTraining.style.opacity = '1';
  }
}

// ========== 混合模式：可见性筛选 ==========
function filterByVisibility(visibility) {
  state.currentVisibility = visibility;

  // 更新按钮状态
  document.querySelectorAll('.visibility-toggle button[data-visibility]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.visibility === visibility);
  });

  renderErrorList();
}

// ========== 混合模式：设置导入可见性 ==========
function setImportVisibility(visibility) {
  state.importVisibility = visibility;

  // 更新按钮状态
  document.querySelectorAll('.visibility-toggle button[data-import-visibility]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.importVisibility === visibility);
  });
}

// ========== 错题列表 ==========
function filterErrors(filter) {
  state.currentFilter = filter;

  // 更新 Tab 状态
  document.querySelectorAll('.tabs .tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });

  renderErrorList();
}

function resetMasteredWords() {
  const errors = VocabStateManager.getAllErrors();
  const masteredCount = errors.filter(e => e.status === 'mastered').length;

  if (masteredCount === 0) {
    showToast('目前没有已掌握的词汇~');
    return;
  }

  if (!confirm(`确定要将 ${masteredCount} 个已掌握词汇重置为待复习吗？`)) {
    return;
  }

  // 重置所有已掌握的词
  const updated = errors.map(e => {
    if (e.status === 'mastered') {
      return {
        ...e,
        status: 'pending',
        correctCount: 0,
        masteredModes: [],
      };
    }
    return e;
  });

  // 保存到 localStorage
  localStorage.setItem('lumos:vocab:errors', JSON.stringify(updated));

  showToast(`已将 ${masteredCount} 个词重置为待复习~`);
  renderErrorList();
  updateMainStats();
}

function renderErrorList() {
  let errors = VocabStateManager.getAllErrors();

  // 可见性筛选（混合模式）
  if (state.currentVisibility === 'public') {
    errors = errors.filter(e => e.visibility === 'public');
  } else if (state.currentVisibility === 'private') {
    errors = errors.filter(e => e.visibility !== 'public');
  }

  // 状态筛选
  if (state.currentFilter === 'pending') {
    errors = errors.filter(e => e.status !== 'mastered');
  } else if (state.currentFilter === 'mastered') {
    errors = errors.filter(e => e.status === 'mastered');
  }

  if (errors.length === 0) {
    elements.errorList.innerHTML = '';
    elements.errorListEmpty.classList.remove('hidden');
    return;
  }

  elements.errorListEmpty.classList.add('hidden');

  const statusMap = {
    pending: '待复习',
    practicing: '练习中',
    mastered: '已掌握',
  };

  elements.errorList.innerHTML = errors.map(error => {
    const visibilityBadge = error.visibility === 'public'
      ? '<span class="visibility-badge visibility-public">🌐 公共</span>'
      : '<span class="visibility-badge visibility-private">🔒 私有</span>';

    return `
      <div class="error-item">
        <div class="error-word">
          <div class="error-word-text">${error.word} <span class="visibility-indicator">${visibilityBadge}</span></div>
          <div class="error-meaning">${error.meaning}</div>
        </div>
        <span class="error-status status-${error.status}">${statusMap[error.status]}</span>
      </div>
    `;
  }).join('');
}

// ========== 导入 ==========
function updateImportStats() {
  const stats = VocabStateManager.getStats();
  const batches = VocabStateManager.getAllBatches();

  elements.importedCount.textContent = stats.total;
  elements.importedBatches.textContent = batches.length;
}

async function importErrors() {
  const text = elements.importTextarea.value.trim();

  if (!text) {
    showToast('请先粘贴数据~');
    return;
  }

  console.log('[importErrors] 开始导入，原始数据长度:', text.length, '可见性:', state.importVisibility);

  try {
    const result = await VocabStateManager.importData(text, {
      visibility: state.importVisibility
    });
    console.log('[importErrors] 导入结果:', result);

    if (result.success && result.addedCount > 0) {
      const visibilityText = state.importVisibility === 'public' ? '公共' : '私有';
      showToast(`成功导入 ${result.addedCount} 条${visibilityText}错题！`);
      elements.importTextarea.value = '';
      updateImportStats();
      updateMainStats();
    } else if (result.success && result.addedCount === 0) {
      showToast('所有词都已导入过了~');
    } else {
      showToast(result.message || '导入失败');
    }
  } catch (e) {
    console.error('[importErrors] 导入出错:', e);
    showToast('导入出错: ' + e.message);
  }
}

function exportData() {
  VocabStateManager.downloadExport();
  showToast('数据已导出~');
}

// ========== 导出默写清单 ==========
function exportPracticeList() {
  const errors = VocabStateManager.getAllErrors();
  const pending = errors.filter(e => e.status !== 'mastered');

  if (pending.length === 0) {
    showToast('🎉 所有词都已掌握啦！');
    return;
  }

  // 生成默写清单 HTML
  const html = generatePracticeListHTML(pending);

  // 下载
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lumos-默写清单-${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`已导出 ${pending.length} 个词的默写清单~`);
}

function generatePracticeListHTML(errors) {
  // 按单元分组
  const byUnit = {};
  for (const e of errors) {
    const unit = e.unit || '未分类';
    if (!byUnit[unit]) byUnit[unit] = [];
    byUnit[unit].push(e);
  }

  let rows = '';
  for (const [unit, words] of Object.entries(byUnit)) {
    rows += `<tr><td colspan="3" style="background: #e8f5e9; font-weight: bold; padding: 8px;">${unit}</td></tr>`;
    for (const w of words) {
      rows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #e0e0e0;">${w.word}</td>
          <td style="padding: 8px; border: 1px solid #e0e0e0;">${w.phonetic || ''}</td>
          <td style="padding: 8px; border: 1px solid #e0e0e0; width: 40%;">${w.meaning}</td>
        </tr>
      `;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lumos 默写清单</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { text-align: center; color: #4CAF50; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f5f5f5; padding: 10px; border: 1px solid #e0e0e0; text-align: left; }
  </style>
</head>
<body>
  <h1>📝 Lumos 默写清单</h1>
  <p style="text-align: center; color: #666;">共 ${errors.length} 个词 | 日期：${new Date().toLocaleDateString()}</p>
  <table>
    <tr>
      <th style="width: 25%;">单词</th>
      <th style="width: 20%;">音标</th>
      <th style="width: 55%;">中文</th>
    </tr>
    ${rows}
  </table>
</body>
</html>`;
}

// ========== 训练 ==========
function startTraining(mode) {
  // 隐藏模式选择
  hideTrainingModeSelect();

  // 获取待训练词
  let errors = [];
  let modeName = '';

  if (mode === 'flash_war') {
    errors = VocabStateManager.getPendingErrors();
    modeName = '⚡ 词汇闪电战';
  } else if (mode === 'confusion') {
    // 混淆词大作战：只获取未掌握的词对
    const total = VocabStateManager.getConfusionTotalCount();
    const mastered = VocabStateManager.getConfusionMasteredCount();
    const masteredPairs = VocabStateManager.getConfusionMasteredPairs();
    const questions = VocabStateManager.getConfusionQuestionsForPractice();

    console.log('[混淆词训练] 开始训练');
    console.log('  总词对数:', total);
    console.log('  已掌握数:', mastered);
    console.log('  已掌握词对keys:', masteredPairs);
    console.log('  本次待练习:', questions.length);

    if (questions.length === 0) {
      showToast(`🎉 太棒了！所有 ${total} 个混淆词对都已掌握！`);
      return;
    }

    resetTrainingState();
    state.training.mode = 'confusion';
    state.training.confusionQuestions = questions;
    state.training.confusionIndex = 0;
    state.training.confusionTotal = total;
    state.training.confusionMastered = mastered;

    showView('training');
    elements.trainingTimer.textContent = `🔀 混淆词大作战 (${mastered}/${total} 已掌握)`;
    startTimer();
    showConfusionQuestion();
    return;
  }

  if (errors.length === 0) {
    showView('completion');
    return;
  }

  // 重置训练状态
  resetTrainingState();
  state.training.mode = mode;
  state.training.correctWordIds = [];

  showView('training');
  elements.trainingTimer.textContent = modeName;
  startTimer();
  nextWord();
}

function resetTrainingState() {
  if (state.training.timerInterval) {
    clearInterval(state.training.timerInterval);
  }

  // 保留混淆词的总数和已掌握数（这些是全局状态，不应重置）
  const confusionTotal = state.training.confusionTotal || 0;
  const confusionMastered = state.training.confusionMastered || 0;

  state.training = {
    active: true,
    mode: null,
    startTime: Date.now(),
    timerInterval: null,
    sessionCorrect: 0,
    sessionTotal: 0,
    currentError: null,
    correctWordIds: [],
    confusionQuestions: [],
    confusionIndex: 0,
    confusionTotal: confusionTotal,
    confusionMastered: confusionMastered,
    showConfusedWord: false,
    currentConfusionPair: null,
  };
}

function startTimer() {
  state.training.timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (state.training.timerInterval) {
    clearInterval(state.training.timerInterval);
    state.training.timerInterval = null;
  }
}

function updateTimer() {
  if (!state.training.active || !state.training.startTime) return;

  const elapsed = Math.floor((Date.now() - state.training.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  elements.trainingTimer.textContent = `⏱️ 训练时长: ${minutes}:${seconds.toString().padStart(2, '0')}`;

  // 10分钟硬上限
  if (elapsed >= 600) {
    showTimeLimitModal();
  }

  // 警告（8分钟后）
  elements.trainingTimer.classList.toggle('warning', elapsed >= 480);
}

// ========== 混淆词大作战 ==========
function showConfusionQuestion() {
  const questions = state.training.confusionQuestions;
  const idx = state.training.confusionIndex;

  if (idx >= questions.length) {
    showConfusionComplete();
    return;
  }

  const pair = questions[idx];
  const showFirst = Math.random() > 0.5;
  state.training.showConfusedWord = showFirst;
  state.training.currentConfusionPair = pair;

  const mainWord = showFirst ? pair.word : pair.confused;
  const mainMeaning = showFirst ? pair.meaning : pair.confusedMeaning;
  const confusedWord = showFirst ? pair.confused : pair.word;
  const confusedMeaning = showFirst ? pair.confusedMeaning : pair.meaning;

  // 更新界面
  elements.wordMeaning.innerHTML = `
    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
      请选择正确的单词：
    </div>
    <div style="font-size: 16px; margin-bottom: 8px;">${mainMeaning}</div>
    <div style="font-size: 14px; color: var(--text-secondary);">
      哪个是"${mainMeaning}"？
    </div>
  `;
  elements.wordPhonetic.textContent = '';

  // 显示选项
  elements.confusionOptionsArea.innerHTML = `
    <div class="confusion-options">
      <button class="btn btn-secondary" data-confusion-choice="${pair.word}">${pair.word}</button>
      <button class="btn btn-secondary" data-confusion-choice="${pair.confused}">${pair.confused}</button>
    </div>
  `;
  elements.confusionOptionsArea.classList.remove('hidden');

  // 隐藏输入框和提交按钮
  elements.answerInput.style.display = 'none';
  elements.btnSubmitAnswer.style.display = 'none';
  elements.feedbackArea.classList.add('hidden');

  // 更新进度（显示本次训练进度 + 总进度）
  const totalMastered = state.training.confusionMastered;
  const total = state.training.confusionTotal;
  elements.trainingProgress.textContent = `本次: ${idx + 1}/${questions.length} | 已掌握: ${totalMastered}/${total}`;
}

function checkConfusionAnswer(answer) {
  const pair = state.training.currentConfusionPair;
  const showFirst = state.training.showConfusedWord;
  const mainWord = showFirst ? pair.word : pair.confused;
  const mainMeaning = showFirst ? pair.meaning : pair.confusedMeaning;
  const confusedWord = showFirst ? pair.confused : pair.word;
  const confusedMeaning = showFirst ? pair.confusedMeaning : pair.meaning;

  const isCorrect = answer === mainWord;

  // 记录训练
  VocabStateManager.saveTrainingRecord({
    errorId: 'confusion-' + pair.word + '-vs-' + pair.confused,
    mode: 'confusion',
    isCorrect,
    responseTime: Date.now() - state.training.startTime,
  });

  state.training.sessionTotal++;

  if (isCorrect) {
    state.training.sessionCorrect++;

    // 标记词对为已掌握（持久化，下次不再出现）
    const pairKey = VocabStateManager.generateConfusionPairKey(pair);
    console.log('[混淆词] 答对！词对key:', pairKey);
    VocabStateManager.markConfusionPairMastered(pairKey);
    state.training.confusionMastered++;

    // 验证保存成功
    const newMasteredPairs = VocabStateManager.getConfusionMasteredPairs();
    console.log('[混淆词] 标记后已掌握列表:', newMasteredPairs);
  }

  // 显示反馈
  elements.confusionOptionsArea.classList.add('hidden');
  elements.feedbackArea.classList.remove('hidden');

  if (isCorrect) {
    elements.feedbackArea.innerHTML = `
      <div class="feedback correct">
        <div class="feedback-emoji">🎉</div>
        <div class="feedback-text">${getRandomFeedback('mastered')}</div>
        <div class="correct-answer">${mainWord} = ${mainMeaning}</div>
        <div class="correct-answer">${confusedWord} = ${confusedMeaning}</div>
      </div>
      <button class="btn btn-primary" id="btn-next-confusion">下一题 →</button>
    `;
  } else {
    elements.feedbackArea.innerHTML = `
      <div class="feedback incorrect">
        <div class="feedback-emoji">😊</div>
        <div class="feedback-text">${getRandomFeedback('wrong')}</div>
        <div class="correct-answer">${mainWord} = ${mainMeaning}</div>
        <div class="correct-answer" style="color: var(--text-secondary);">${confusedWord} = ${confusedMeaning}</div>
      </div>
      <button class="btn btn-primary" id="btn-next-confusion">继续 →</button>
    `;
  }

  // 绑定下一题按钮
  $('btn-next-confusion').onclick = nextConfusionQuestion;
}

function nextConfusionQuestion() {
  state.training.confusionIndex++;
  showConfusionQuestion();
}

function showConfusionComplete() {
  state.training.active = false;
  stopTimer();

  const accuracy = state.training.sessionTotal > 0
    ? Math.round(state.training.sessionCorrect / state.training.sessionTotal * 100)
    : 0;

  const modal = elements.timeLimitModal;
  modal.querySelector('.modal-title').textContent = '🎉 混淆词练习完成！';
  modal.querySelector('.modal-text').innerHTML =
    `正确率 ${accuracy}%！<br>` +
    `${state.training.sessionCorrect}/${state.training.sessionTotal} 题答对！<br><br>` +
    `太棒了！继续加油~`;
  modal.querySelector('.btn-primary').textContent = '返回主页';
  modal.querySelector('.btn-primary').onclick = () => {
    modal.classList.remove('show');
    showView('main');
  };
  modal.classList.add('show');
}

// ========== 计时器相关 ==========
function showTimeLimitModal() {
  state.training.active = false;
  stopTimer();
  elements.timeLimitModal.classList.add('show');
}

function closeTimeLimitModal() {
  elements.timeLimitModal.classList.remove('show');
  showView('main');
}

// ========== 下一题 ==========
function nextWord() {
  // 混淆词大作战
  if (state.training.mode === 'confusion') {
    showConfusionQuestion();
    return;
  }

  // 词汇闪电战
  const error = VocabStateManager.getNextPendingError(state.training.correctWordIds);

  if (!error) {
    endTraining();
    showView('completion');
    return;
  }

  state.training.currentError = error;

  // 更新界面
  elements.wordMeaning.textContent = error.meaning;
  elements.wordPhonetic.textContent = error.phonetic ? `/${error.phonetic}/` : '';

  // 确保输入框可见
  elements.answerInput.style.display = 'block';
  elements.answerInput.value = '';
  elements.answerInput.focus();

  // 显示提交按钮
  elements.btnSubmitAnswer.style.display = 'block';

  // 隐藏混淆词选项区域
  elements.confusionOptionsArea.classList.add('hidden');

  // 隐藏反馈
  elements.feedbackArea.classList.add('hidden');

  // 更新进度
  const stats = VocabStateManager.getStats();
  const practiced = stats.total - (stats.pending + stats.practicing);
  elements.trainingProgress.textContent = `进度: ${practiced}/${stats.total}`;
}

// ========== 提交答案 ==========
function checkAnswer() {
  if (!state.training.active || !state.training.currentError) {
    showToast('请先开始训练~');
    return;
  }

  const userAnswer = elements.answerInput.value.trim();

  if (!userAnswer) {
    showToast('请输入答案~');
    return;
  }

  const error = state.training.currentError;
  const isCorrect = normalizeWord(userAnswer) === normalizeWord(error.word);

  // 记录训练
  VocabStateManager.saveTrainingRecord({
    errorId: error.id,
    mode: state.training.mode || 'flash_war',
    isCorrect,
    responseTime: Date.now() - state.training.startTime,
  });

  state.training.sessionTotal++;

  // 显示反馈
  elements.feedbackArea.classList.remove('hidden');

  if (isCorrect) {
    state.training.sessionCorrect++;
    VocabStateManager.markCorrect(error.id, state.training.mode);

    // 追踪已正确回答的词
    state.training.correctWordIds.push(error.id);

    const stats = VocabStateManager.getStats();
    const progressText = `<div class="correct-answer">今日已掌握: ${stats.mastered} 个词</div>`;

    elements.feedbackArea.innerHTML = `
      <div class="feedback correct">
        <div class="feedback-emoji">🎉</div>
        <div class="feedback-text">${getRandomFeedback('mastered')}</div>
        ${progressText}
      </div>
      <button class="btn btn-primary" id="btn-next-word">下一题 →</button>
    `;
  } else {
    VocabStateManager.markIncorrect(error.id);

    elements.feedbackArea.innerHTML = `
      <div class="feedback incorrect">
        <div class="feedback-emoji">😊</div>
        <div class="feedback-text">${getRandomFeedback('wrong')}</div>
        <div class="correct-answer">正确答案: ${error.word}</div>
      </div>
      <button class="btn btn-primary" id="btn-next-word">继续 →</button>
    `;
  }

  // 绑定下一题按钮
  $('btn-next-word').onclick = nextWord;
}

function endTraining() {
  state.training.active = false;
  stopTimer();
  cleanupTrainingUI();
  showView('main');
}

function cleanupTrainingUI() {
  elements.confusionOptionsArea.classList.add('hidden');
  elements.answerInput.classList.remove('hidden');
  elements.btnSubmitAnswer.classList.remove('hidden');
  elements.feedbackArea.classList.add('hidden');
}

// ========== 事件绑定 ==========
function setupEventListeners() {
  // 导航按钮
  $('btn-start-training').onclick = showTrainingModeSelect;
  $('btn-error-list').onclick = () => showView('list');
  $('btn-import').onclick = () => showView('import');
  $('btn-back-list').onclick = () => showView('main');
  $('btn-back-import').onclick = () => showView('main');
  $('btn-back-main').onclick = () => showView('main');
  $('btn-end-training').onclick = endTraining;

  // 训练模式选择
  document.querySelectorAll('.mode-card[data-mode]').forEach(card => {
    card.onclick = () => startTraining(card.dataset.mode);
  });
  $('btn-cancel-mode').onclick = hideTrainingModeSelect;

  // 可见性筛选
  document.querySelectorAll('.visibility-toggle button[data-visibility]').forEach(btn => {
    btn.onclick = () => filterByVisibility(btn.dataset.visibility);
  });

  // 导入可见性
  document.querySelectorAll('.visibility-toggle button[data-import-visibility]').forEach(btn => {
    btn.onclick = () => setImportVisibility(btn.dataset.importVisibility);
  });

  // 状态筛选
  document.querySelectorAll('.tabs .tab').forEach(tab => {
    tab.onclick = () => filterErrors(tab.dataset.filter);
  });

  // 重置已掌握
  $('btn-reset-mastered').onclick = resetMasteredWords;

  // 导入导出
  $('btn-do-import').onclick = importErrors;
  $('btn-export').onclick = exportData;
  $('btn-export-practice').onclick = exportPracticeList;

  // 提交答案
  $('btn-submit-answer').onclick = checkAnswer;

  // 混淆词选择
  elements.confusionOptionsArea.addEventListener('click', (e) => {
    const choiceBtn = e.target.closest('[data-confusion-choice]');
    if (choiceBtn) {
      checkConfusionAnswer(choiceBtn.dataset.confusionChoice);
    }
  });

  // 回车提交
  elements.answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  });

  // Modal 按钮
  $('btn-modal-confirm').onclick = closeTimeLimitModal;
}

// ========== 初始化 ==========
async function init() {
  console.log('[Lumos Vocab] 开始初始化...');

  // 绑定所有事件
  setupEventListeners();

  // 检查 localStorage 状态
  const localData = localStorage.getItem('lumos:vocab:errors');
  console.log('[Lumos Vocab] localStorage 状态:', localData ? '有数据' : '空');

  // 确保数据已加载
  await VocabStateManager.ensureInitialized();

  state.initialized = true;
  updateMainStats();

  // 验证数据是否加载成功
  const stats = VocabStateManager.getStats();
  console.log('[Lumos Vocab] 初始化完成，统计数据:', stats);

  // 显示调试信息
  const localDataAfter = localStorage.getItem('lumos:vocab:errors');
  if (localDataAfter) {
    const parsed = JSON.parse(localDataAfter);
    console.log('[调试] localStorage 实际数据条数:', parsed.length);
  }

  if (stats.total === 0) {
    console.log('[Lumos Vocab] 数据加载失败，尝试手动加载...');
    try {
      const response = await fetch('data/errors.json');
      const data = await response.json();
      console.log('[手动加载] 获取到数据:', data.errors?.length, '条');
      if (data.errors && data.errors.length > 0) {
        VocabStateManager.addErrorsBatch(data.errors, 'debug-load');
        updateMainStats();
      }
    } catch (e) {
      console.error('[手动加载] 失败:', e);
    }
  }
}

// 启动
document.addEventListener('DOMContentLoaded', init);
