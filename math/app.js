// === State ===
const state = {
  knowledge: null,
  mastery: {},
  currentView: 'subject-grid',
  history: [],
  practiceQuestions: [],
  practiceIndex: 0,
  practiceMode: null,
  // 当前列表视图的参数（用于刷新）
  currentListParams: null,
  // 列表视图是否需要刷新
  listViewStale: false,
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
  await loadMastery();
  await loadKnowledge();
  setupNavigation();
  setupSearch();
  setupGlobalDelegation();
  updateStats();
  // 自动导出提醒检查（延迟 3 秒显示，避免干扰初始使用）
  setTimeout(() => {
    StateManager.shouldRemindExport().then(shouldRemind => {
      if (shouldRemind) {
        if (confirm('您已 7 天未导出数据，建议现在导出备份吗？')) {
          exportData();
        }
      }
    }).catch(e => {
      console.error('[app.js] shouldRemindExport failed:', e);
    });
  }, 3000);
});

async function loadKnowledge() {
  try {
    const resp = await fetch('data/knowledge.json');
    state.knowledge = await resp.json();
  } catch (e) {
    console.error('Failed to load knowledge data:', e);
  }
}

// === Mastery Persistence (StateManager) ===
async function loadMastery() {
  try {
    state.mastery = await StateManager.getAllMastery();
  } catch (e) {
    console.warn('[app.js] Failed to load mastery:', e);
    state.mastery = {};
  }
}

async function saveMastery() {
  try {
    await StateManager.saveAllMastery(state.mastery);
  } catch (e) {
    console.error('[app.js] Failed to save mastery:', e);
  }
}

function getMastery(id) {
  return state.mastery[id] || 'unlearned';
}

async function setMastery(id, level) {
  state.mastery[id] = level;
  await saveMastery();
  updateStats();
  // 标记列表视图需要刷新
  state.listViewStale = true;
}

async function resetAllMastery() {
  // 显示选择性重置选项（v0.4 增强）
  showResetOptions();
}

// 显示重置选项（选择性重置）
function showResetOptions() {
  const options = [
    { id: 'mastery', label: '只重置掌握状态', dangerous: true },
    { id: 'weak',    label: '只重置薄弱点',   dangerous: false },
    { id: 'all',     label: '重置所有数据',     dangerous: true },
  ];
  let msg = '请选择要重置的内容：\n\n';
  options.forEach((opt, idx) => {
    msg += (idx + 1) + '. ' + opt.label + '\n';
  });
  msg += '\n输入数字选择（1-3），或取消：';
  const choice = prompt(msg, '');
  if (!choice) return; // 取消
  const idx = parseInt(choice, 10) - 1;
  if (idx < 0 || idx >= options.length) {
    alert('无效选择');
    return;
  }
  const selected = options[idx];
  if (!confirm('确定要' + selected.label + '吗？此操作不可撤销。')) return;
  // 执行重置
  if (selected.id === 'mastery') {
    StateManager.clearMastery().then(() => {
      state.mastery = {};
      updateStats();
      showToast('已重置掌握状态');
    });
  } else if (selected.id === 'weak') {
    StateManager.clearWeakPoints().then(() => {
      showToast('已重置薄弱点');
    });
  } else if (selected.id === 'all') {
    StateManager.clearAll().then(() => {
      state.mastery = {};
      updateStats();
      showToast('已重置所有数据');
    });
  }
}

async function exportData() {
  try {
    const data = await StateManager.exportAll();
    const userId = StateManager.getUserId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lumos-backup-${userId}-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('学习数据已下载（' + filename + '）');
  } catch (e) {
    console.error('[app.js] exportData failed:', e);
    showToast('导出失败，请重试');
  }
}

// === Global Event Delegation (WeChat inline-handler compatible) ===
function setupGlobalDelegation() {
  document.getElementById('app').addEventListener('click', function(e) {
    var el = e.target;
    // Walk up to find an actionable element
    while (el && el !== this) {
      var action = el.getAttribute('data-action');
      if (action) {
        e.preventDefault();
        handleAction(action, el);
        return;
      }
      el = el.parentElement;
    }
  });
}

function handleAction(action, el) {
  switch (action) {
    case 'subject':
      selectSubject();
      break;
    case 'grade':
      selectGrade(parseInt(el.dataset.grade), el.dataset.term);
      break;
    case 'chapter':
      selectChapter(parseInt(el.dataset.grade), el.dataset.term, parseInt(el.dataset.chapter));
      break;
    case 'detail':
      showDetail(el.dataset.id);
      break;
    case 'mastery':
      changeMastery(el.dataset.id, el.dataset.level);
      break;
    case 'practice':
      startPractice(el.dataset.id);
      break;
    case 'weakpoint':
      addToWeakPoints(el.dataset.id);
      break;
    case 'show-answer':
      showAnswer();
      break;
    case 'next-practice':
      nextPractice();
      break;
    case 'prev-practice':
      prevPractice();
      break;
    case 'back-to-map':
      resetViews();
      document.querySelector('.nav-btn[data-tab="tab-map"]').click();
      break;
    case 'search-nav':
      quickNavToPoint(el.dataset.id);
      break;
    case 'show-reset-options':
      showResetOptions();
      break;
    case 'export-data':
      exportData();
      break;
    case 'clear-practice-history':
      clearPracticeHistory();
      break;
  }
}

// === Navigation ===
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'tab-practice') {
        // 切换到练习标签页时，加载练习历史
        loadPracticeHistory();
      } else {
        resetViews();
        if (btn.dataset.tab === 'tab-me') updateStats();
      }
    });
  });

  document.getElementById('btn-back').addEventListener('click', goBack);
}

function resetViews() {
  document.getElementById('subject-grid').style.display = 'block';
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('detail-view').style.display = 'none';
  document.getElementById('practice-view').style.display = 'none';
  document.querySelector('#tab-practice .empty-state').style.display = 'block';
  document.getElementById('header-title').textContent = '知识地图';
  document.getElementById('btn-back').style.visibility = 'hidden';
  state.currentView = 'subject-grid';
  state.history = [];
  // 更新统计数据（确保知识地图显示最新掌握情况）
  updateStats();
}

function goBack() {
  if (state.history.length === 0) return;
  var prev = state.history.pop();

  if (prev === 'subject-grid') {
    // 返回到主视图（显示"数学"卡片）
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('subject-grid').style.display = 'block';
    document.getElementById('header-title').textContent = '知识地图';
    document.getElementById('btn-back').style.visibility = 'hidden';
    state.currentView = 'subject-grid';
    // 更新"数学"卡片的统计数据
    updateStats();
  } else if (prev.startsWith('list-')) {
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('subject-grid').style.display = 'none';
    document.getElementById('list-view').style.display = 'block';
    
    // 判断是返回到年级列表还是章节列表
    if (prev === 'grade-list') {
      document.getElementById('header-title').textContent = '选择年级';
      document.getElementById('btn-back').style.visibility = 'visible';
      // 重新渲染年级列表以更新统计数据
      selectSubject(true);
    } else {
      document.getElementById('header-title').textContent = '选择章节';
      document.getElementById('btn-back').style.visibility = 'visible';
      // 重新渲染列表视图以更新统计数据
      if (state.currentListParams) {
        const params = state.currentListParams;
        if (params.type === 'chapters') {
          selectGrade(params.grade, params.term, true);
        } else if (params.type === 'points') {
          selectChapter(params.grade, params.term, params.chapterNo, true);
        }
      }
    }
    state.currentView = prev;
  } else if (prev.startsWith('detail-')) {
    // 从详情页返回到列表视图
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('list-view').style.display = 'block';
    document.getElementById('header-title').textContent = '选择章节';
    state.currentView = state.history.length > 0 ? state.history[state.history.length - 1] : 'grade-list';
    
    // 重新渲染列表视图以更新统计数据
    if (state.currentListParams) {
      const params = state.currentListParams;
      if (params.type === 'chapters') {
        selectGrade(params.grade, params.term, true);
      } else if (params.type === 'points') {
        selectChapter(params.grade, params.term, params.chapterNo, true);
      }
    }
  }
}

// === Subject -> Grade Selection ===
function selectSubject(skipHistory) {
  if (!state.knowledge) return;

  var chapters = state.knowledge.chapters;
  var grades = {};
  chapters.forEach(function(ch) {
    var key = ch.grade + '-' + ch.term;
    if (!grades[key]) grades[key] = { grade: ch.grade, term: ch.term, chapters: [], count: 0 };
    grades[key].chapters.push(ch);
    grades[key].count += ch.count;
  });

  var gradeMap = {7:'七年级',8:'八年级',9:'九年级'};
  var termMap = {上:'上册',下:'下册'};

  var html = '';
  var keys = Object.keys(grades).sort();
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var g = grades[key];
    var mastered = g.chapters.reduce(function(s, c) {
      return s + state.knowledge.points.filter(function(p) {
        return p.grade === g.grade && p.chapter_no === c.chapter_no;
      }).reduce(function(sum, kp) {
        return sum + (getMastery(kp.id) === 'mastered' ? 1 : 0);
      }, 0);
    }, 0);

    html += '<div class="card subject-card" data-action="grade" data-grade="' + g.grade + '" data-term="' + g.term + '">' +
      '<div class="subject-icon">📖</div>' +
      '<div class="subject-info">' +
        '<div class="subject-name">' + gradeMap[g.grade] + termMap[g.term] + '</div>' +
        '<div class="subject-stats">' + g.chapters.length + ' 章 · ' + g.count + ' 个知识点 · ' + mastered + ' 已掌握</div>' +
        '<div class="progress-bar">' +
          '<div class="progress-fill" style="width:' + (g.count > 0 ? Math.round(mastered/g.count*100) : 0) + '%"></div>' +
        '</div>' +
      '</div>' +
      '<div class="arrow">›</div>' +
    '</div>';
  }

  document.getElementById('list-view').innerHTML = '<ul class="tree-list">' + html + '</ul>';
  document.getElementById('list-view').style.display = 'block';
  document.getElementById('subject-grid').style.display = 'none';
  document.getElementById('header-title').textContent = '选择年级';
  document.getElementById('btn-back').style.visibility = 'visible';
  state.currentView = 'grade-list';
  if (!skipHistory) {
    state.history.push('subject-grid');
  }
  // 存储当前列表视图参数（用于刷新）
  state.currentListParams = { type: 'grades' };
}

// === Grade -> Chapter Selection ===
function selectGrade(grade, term, skipHistory) {
  if (!state.knowledge) return;

  var chs = state.knowledge.chapters.filter(function(c) { return c.grade === grade && c.term === term; });
  var gradeMap = {7:'七',8:'八',9:'九'};
  var termMap = {上:'上',下:'下'};

  var html = '<div class="list-header" style="font-size:14px;color:var(--text-secondary);padding:8px 0">' +
    gradeMap[grade] + '年级' + termMap[term] + '册 · ' + chs.length + ' 章</div>';

  chs.sort(function(a,b) { return a.chapter_no - b.chapter_no; });
  for (var i = 0; i < chs.length; i++) {
    var ch = chs[i];
    var points = state.knowledge.points.filter(function(p) { return p.grade === ch.grade && p.chapter_no === ch.chapter_no; });
    var mastered = points.filter(function(p) { return getMastery(p.id) === 'mastered'; }).length;
    var pct = ch.count > 0 ? Math.round(mastered / ch.count * 100) : 0;
    var highCount = points.filter(function(p) { return p.exam_weight === 'high'; }).length;
    var badgeClass = pct === 100 ? 'mastered' : pct > 0 ? 'fuzzy' : 'unlearned';

    html += '<div class="tree-item" data-action="chapter" data-grade="' + grade + '" data-term="' + term + '" data-chapter="' + ch.chapter_no + '">' +
      '<div style="flex:1">' +
        '<div style="font-weight:500">第' + ch.chapter_no + '章 ' + ch.chapter + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px">' + ch.count + ' 个知识点 · ' + mastered + ' 已掌握' + (highCount > 0 ? ' · ' + highCount + '⭐重点' : '') + '</div>' +
      '</div>' +
      '<div class="badge badge-' + badgeClass + '">' + pct + '%</div>' +
      '<div class="arrow">›</div>' +
    '</div>';
  }

  var listView = document.getElementById('list-view');
  listView.innerHTML = '<ul class="tree-list">' + html + '</ul>';
  listView.style.display = 'block';
  document.getElementById('subject-grid').style.display = 'none';
  document.getElementById('header-title').textContent = gradeMap[grade] + '年级' + termMap[term] + '册';
  document.getElementById('btn-back').style.visibility = 'visible';

  state.currentView = 'list-' + grade + '-' + term;
  if (!skipHistory) {
    state.history.push('subject-grid');
  }
  // 存储当前列表视图参数（用于刷新）
  state.currentListParams = { type: 'chapters', grade, term };
}

// === Chapter -> Knowledge Points ===
function selectChapter(grade, term, chapterNo, skipHistory) {
  if (!state.knowledge) return;

  var ch = state.knowledge.chapters.find(function(c) { return c.grade === grade && c.chapter_no === chapterNo; });
  var points = state.knowledge.points.filter(function(p) { return p.grade === grade && p.chapter_no === chapterNo; });
  var gradeMap = {7:'七',8:'八',9:'九'};

  var html = '<div class="list-header" style="font-size:14px;color:var(--text-secondary);padding:8px 0">' +
    '第' + chapterNo + '章 ' + (ch ? ch.chapter : '') + ' · ' + points.length + ' 个知识点</div>';

  for (var i = 0; i < points.length; i++) {
    var kp = points[i];
    var m = getMastery(kp.id);
    var mLabel = {mastered:'已掌握', fuzzy:'有模糊', unlearned:'未学'}[m];
    var wBadge = kp.exam_weight === 'high' ? '<span class="badge badge-high">重点</span>' : '';
    html += '<div class="tree-item" data-action="detail" data-id="' + kp.id + '">' +
      '<div style="flex:1">' +
        '<div style="font-weight:500">' + kp.topic + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px">' + kp.section + '</div>' +
      '</div>' +
      wBadge +
      '<span class="badge badge-' + m + '" style="margin-left:8px">' + mLabel + '</span>' +
      '<div class="arrow">›</div>' +
    '</div>';
  }

  var listView = document.getElementById('list-view');
  listView.innerHTML = '<ul class="tree-list">' + html + '</ul>';
  listView.style.display = 'block';
  document.getElementById('detail-view').style.display = 'none';
  document.getElementById('header-title').textContent = '第' + chapterNo + '章 ' + (ch ? ch.chapter : '');

  state.currentView = 'list-' + grade + '-' + term + '-' + chapterNo;
  if (!skipHistory) {
    state.history.push('list-' + grade + '-' + term);
  }
  // 存储当前列表视图参数（用于刷新）
  state.currentListParams = { type: 'points', grade, term, chapterNo };
}

// === Knowledge Point Detail ===
function showDetail(id) {
  if (!state.knowledge) return;

  var kp = state.knowledge.points.find(function(p) { return p.id === id; });
  if (!kp) return;

  var m = getMastery(id);

  var content = '<h2>' + kp.topic + '</h2>' +
    '<div class="tag-row">' +
      kp.tags.map(function(t) { return '<span class="tag">' + t + '</span>'; }).join('') +
      (kp.exam_weight === 'high' ? '<span class="tag" style="background:#FEE2E2;color:#991B1B;">⭐ 高频考点</span>' : '') +
    '</div>' +
    '<div class="mastery-status" style="margin:12px 0;padding:8px;background:var(--bg-secondary);border-radius:8px;">' +
      '掌握状态: <span id="mastery-status-badge" class="badge badge-' + m + '">' + {mastered:'已掌握 ✅', fuzzy:'有模糊 🤔', unlearned:'未学 📚'}[m] + '</span>' +
    '</div>';

  // Definition
  if (kp.definition) {
    content += '<h3>📖 定义</h3><div style="font-size:14px;line-height:1.7">' + kp.definition + '</div>';
  }

  // Formula
  if (kp.formula) {
    content += '<h3>📐 核心公式/定理</h3><div class="formula-block">' + kp.formula + '</div>';
  }

  // Proof
  if (kp.proof) {
    content += '<h3>🔍 推导证明</h3><p>' + kp.proof + '</p>';
  }

  // Examples
  if (kp.examples && kp.examples.length > 0) {
    content += '<h3>💡 例题</h3>';
    kp.examples.forEach(function(ex, i) {
      content += '<p style="font-weight:500">' + (i+1) + '. ' + ex.question + '</p>';
      if (ex.solution) content += '<p style="color:var(--text-secondary);padding-left:8px">解：' + ex.solution + '</p>';
    });
  }

  // Common Mistakes
  if (kp.mistakes && kp.mistakes.length > 0) {
    content += '<h3>⚠️ 易错提醒</h3><ul>';
    kp.mistakes.forEach(function(m) { content += '<li>' + m + '</li>'; });
    content += '</ul>';
  }

  // Exam Points
  if (kp.exam_points && kp.exam_points.length > 0) {
    content += '<h3>🎯 中考考点</h3><ul>';
    kp.exam_points.forEach(function(e) { content += '<li>' + e + '</li>'; });
    content += '</ul>';
  }

  // Related Knowledge
  if (kp.related_knowledge && kp.related_knowledge.length > 0) {
    content += '<h3>🔗 关联知识点</h3><div class="related-links">';
    kp.related_knowledge.forEach(function(r) {
      var related = state.knowledge.points.find(function(p) {
        return p.filename === r.target + '.md' || p.topic.includes(r.target) || p.id.includes(r.target);
      });
      if (related) {
        content += '<button class="related-chip" data-action="detail" data-id="' + related.id + '">' + r.label + '</button>';
      } else {
        content += '<span class="related-chip">' + r.label + '</span>';
      }
    });
    content += '</div>';
  }

  // Mastery Toggle
  content += '<h3>📝 掌握状态</h3>' +
    '<div class="mastery-toggle">' +
      '<button class="mastery-btn mastered' + (m === 'mastered' ? ' selected' : '') + '" data-action="mastery" data-id="' + id + '" data-level="mastered">✅ 已掌握</button>' +
      '<button class="mastery-btn fuzzy' + (m === 'fuzzy' ? ' selected' : '') + '" data-action="mastery" data-id="' + id + '" data-level="fuzzy">🤔 有模糊</button>' +
      '<button class="mastery-btn unlearned' + (m === 'unlearned' ? ' selected' : '') + '" data-action="mastery" data-id="' + id + '" data-level="unlearned">📚 未学</button>' +
    '</div>';

  // Actions
  var hasPractice = kp.practice && kp.practice.length > 0;
  content += '<div class="detail-actions">' +
    (hasPractice ? '<button class="btn-primary" data-action="practice" data-id="' + id + '">✏️ 开始练习 (' + kp.practice.length + '题)</button>' : '') +
    '<button class="btn-secondary" data-action="weakpoint" data-id="' + id + '">📌 加入薄弱点</button>' +
  '</div>';

  document.getElementById('detail-view').querySelector('.detail-content').innerHTML = content;
  document.getElementById('detail-view').style.display = 'block';
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('subject-grid').style.display = 'none';
  document.getElementById('header-title').textContent = kp.topic;
  document.getElementById('btn-back').style.visibility = 'visible';

  // Render LaTeX after DOM update
  setTimeout(function() {
    renderLatex(document.getElementById('detail-view').querySelector('.detail-content'));
  }, 0);

  state.currentView = 'detail-' + id;
  state.history.push(state.currentView === 'subject-grid' ? 'subject-grid' :
    state.currentView.startsWith('list-') ? state.currentView : 'subject-grid');
}

function changeMastery(id, level) {
  setMastery(id, level);
  var buttons = document.querySelectorAll('.mastery-btn');
  buttons.forEach(function(b) {
    b.classList.remove('selected');
    if ((level === 'mastered' && b.classList.contains('mastered')) ||
        (level === 'fuzzy' && b.classList.contains('fuzzy')) ||
        (level === 'unlearned' && b.classList.contains('unlearned'))) {
      b.classList.add('selected');
    }
  });
  showToast({mastered:'已标记为已掌握 ✅', fuzzy:'已标记为有模糊 🤔', unlearned:'已标记为未学 📚'}[level]);
  
  // 更新掌握状态徽章
  var badge = document.getElementById('mastery-status-badge');
  if (badge) {
    badge.className = 'badge badge-' + level + '';
    badge.textContent = {mastered:'已掌握 ✅', fuzzy:'有模糊 🤔', unlearned:'未学 📚'}[level];
  }
}

// === Practice ===
function startPractice(id) {
  if (!state.knowledge) return;

  var kp = state.knowledge.points.find(function(p) { return p.id === id; });
  if (!kp || !kp.practice || kp.practice.length === 0) return;

  state.practiceMode = id;
  state.practiceIndex = 0;
  state.practiceQuestions = kp.practice;
  state.practiceResults = [];

  // Switch to practice tab
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelector('.nav-btn[data-tab="tab-practice"]').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('tab-practice').classList.add('active');
  document.querySelector('#tab-practice .empty-state').style.display = 'none';

  // Hide map views that might overlap
  document.getElementById('subject-grid').style.display = 'none';
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('detail-view').style.display = 'none';

  document.getElementById('header-title').textContent = '练习: ' + kp.topic;
  document.getElementById('btn-back').style.visibility = 'visible';
  renderPracticeQuestion();
}

function renderPracticeQuestion() {
  var q = state.practiceQuestions[state.practiceIndex];
  if (!q) return;

  var isFirst = state.practiceIndex === 0;
  var isLast = state.practiceIndex >= state.practiceQuestions.length - 1;
  var userAnswer = state.practiceResults[state.practiceIndex] || '';
  
  var html = '<div class="practice-card">' +
    '<div style="font-size:13px;color:var(--text-tertiary);margin-bottom:8px">' +
      '第 ' + (state.practiceIndex + 1) + ' / ' + state.practiceQuestions.length + ' 题' +
    '</div>' +
    '<div class="practice-question">' + q.question + '</div>' +
    '<div id="practice-input-area" style="margin:16px 0;">' +
      '<textarea id="practice-answer-input" placeholder="在这里输入你的答案..." style="width:100%;min-height:80px;padding:8px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;resize:vertical;">' + userAnswer + '</textarea>' +
    '</div>' +
    '<div class="answer-reveal" id="answer-reveal" style="display:none;">' +
      '<div class="answer-title">📋 答案</div>' +
      '<div class="answer-text">' + q.answer + '</div>' +
      (q.explanation ? '<div class="answer-title" style="margin-top:8px">💡 解析</div><div class="answer-text">' + q.explanation + '</div>' : '') +
    '</div>' +
  '</div>' +
  '<div class="practice-nav">' +
    '<button data-action="prev-practice" ' + (isFirst ? 'disabled style="opacity:0.5;"' : '') + '>← 上一题</button>' +
    '<button data-action="show-answer">查看答案</button>' +
    '<button data-action="next-practice">' + (isLast ? '完成 ✓' : '下一题 →') + '</button>' +
  '</div>';

  document.getElementById('practice-view').innerHTML = html;
  document.getElementById('practice-view').style.display = 'block';

  // 保存用户输入
  var input = document.getElementById('practice-answer-input');
  if (input) {
    input.addEventListener('input', function() {
      state.practiceResults[state.practiceIndex] = this.value;
    });
  }

  // Render LaTeX in practice content
  setTimeout(function() {
    renderLatex(document.getElementById('practice-view'));
  }, 0);
}

function showAnswer() {
  var reveal = document.getElementById('answer-reveal');
  if (reveal) {
    reveal.style.display = 'block';
  }
}

function prevPractice() {
  if (state.practiceIndex > 0) {
    // 保存当前答案
    var input = document.getElementById('practice-answer-input');
    if (input) {
      state.practiceResults[state.practiceIndex] = input.value;
    }
    state.practiceIndex--;
    renderPracticeQuestion();
  }
}

function nextPractice() {
  // 保存当前答案
  var input = document.getElementById('practice-answer-input');
  if (input) {
    state.practiceResults[state.practiceIndex] = input.value;
  }
  
  state.practiceIndex++;
  if (state.practiceIndex >= state.practiceQuestions.length) {
    // 练习完成，保存历史记录
    savePracticeHistory();
    document.getElementById('practice-view').innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-icon">🎉</div>' +
        '<p>练习完成！</p>' +
        '<p class="hint">共完成 ' + state.practiceQuestions.length + ' 道题目</p>' +
        '<button class="btn-primary" style="margin-top:16px;width:200px" data-action="back-to-map">返回知识地图</button>' +
      '</div>';
    return;
  }
  renderPracticeQuestion();
}

// 保存练习历史记录
async function savePracticeHistory() {
  if (!state.knowledge || !state.practiceMode) return;
  
  const knowledgeId = state.practiceMode;
  const knowledge = state.knowledge.points.find(p => p.id === knowledgeId);
  const record = {
    knowledgeId: knowledgeId,
    knowledgeTopic: knowledge ? knowledge.topic : '未知知识点',
    totalQuestions: state.practiceQuestions.length,
    answers: state.practiceResults.map((answer, index) => ({
      questionIndex: index,
      question: state.practiceQuestions[index].question,
      userAnswer: answer || '',
      correctAnswer: state.practiceQuestions[index].answer,
      hasAnswer: !!answer,
    })),
    completedAt: new Date().toISOString(),
  };
  
  try {
    await StateManager.savePracticeHistory(record);
    console.log('[app.js] 练习历史已保存', record);
  } catch (e) {
    console.error('[app.js] 保存练习历史失败', e);
  }
}

// === Search ===
function setupSearch() {
  var searchBtn = document.getElementById('btn-search');
  var searchOverlay = document.getElementById('search-overlay');
  var searchInput = document.getElementById('search-input');
  var searchClose = document.getElementById('btn-search-close');
  var searchResults = document.getElementById('search-results');

  searchBtn.addEventListener('click', function() {
    searchOverlay.style.display = 'block';
    searchInput.focus();
  });

  searchClose.addEventListener('click', function() {
    searchOverlay.style.display = 'none';
    searchInput.value = '';
    searchResults.innerHTML = '';
  });

  searchInput.addEventListener('input', function() {
    var q = searchInput.value.trim().toLowerCase();
    if (!q || !state.knowledge) { searchResults.innerHTML = ''; return; }

    var matches = state.knowledge.points.filter(function(p) {
      return p.topic.toLowerCase().includes(q) ||
        p.chapter.toLowerCase().includes(q) ||
        p.tags.some(function(t) { return t.toLowerCase().includes(q); }) ||
        (p.definition_plain && p.definition_plain.toLowerCase().includes(q));
    }).slice(0, 20);

    searchResults.innerHTML = matches.map(function(p) {
      return '<div class="search-item" data-action="search-nav" data-id="' + p.id + '">' +
        '<div style="font-weight:500">' + p.topic + '</div>' +
        '<div class="chapter-label">' + p.chapter + ' · ' + p.section + '</div>' +
      '</div>';
    }).join('');
  });
}

function quickNavToPoint(id) {
  document.getElementById('search-overlay').style.display = 'none';
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelector('.nav-btn[data-tab="tab-map"]').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById('tab-map').classList.add('active');
  showDetail(id);
}

// === LaTeX Rendering ===
function renderLatex(container) {
  if (!container || typeof katex === 'undefined') return;

  var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  var textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  for (var i = 0; i < textNodes.length; i++) {
    var node = textNodes[i];
    var html = node.textContent;

    // Replace display math $$...$$
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, function(_, formula) {
      try {
        return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false, trust: true });
      } catch (e) {
        return '<span class="katex-error" title="' + e.message + '">$$' + formula + '$</span>';
      }
    });

    // Replace inline math $...$ (avoid matching \$)
    // Step 1: Replace \$ with placeholder
    html = html.replace(/\\\$/g, '\x00');
    
    // Step 2: Match $...$
    html = html.replace(/\$([^$]+?)\$/g, function(_, formula) {
      try {
        return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false, trust: true });
      } catch (e) {
        return '<span class="katex-error" title="' + e.message + '">$' + formula + '$</span>';
      }
    });
    
    // Step 3: Restore \$ placeholder
    html = html.replace(/\x00/g, '\\$');

    if (html !== node.textContent) {
      var span = document.createElement('span');
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
    }
  }
}

// === Practice History ===
async function loadPracticeHistory() {
  try {
    const history = await StateManager.getPracticeHistory();
    const historyList = document.getElementById('practice-history-list');
    const emptyState = document.getElementById('practice-empty');
    
    if (history.length === 0) {
      historyList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    
    historyList.style.display = 'block';
    emptyState.style.display = 'none';
    
    // 按时间倒序排列
    const sortedHistory = history.sort((a, b) => b.timestamp - a.timestamp);
    
    let html = '';
    sortedHistory.forEach(record => {
      const date = new Date(record.timestamp);
      const dateStr = date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
      const answeredCount = record.answers.filter(a => a.hasAnswer).length;
      
      html += '<div class="practice-history-item" style="padding:12px;margin-bottom:8px;background:var(--bg-secondary);border-radius:8px;cursor:pointer;" data-action="view-practice-detail" data-record-id="' + record.recordId + '">' +
        '<div style="font-weight:500;margin-bottom:4px;">' + record.knowledgeTopic + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);">' +
          '<span>' + dateStr + '</span> · ' +
          '<span>' + record.totalQuestions + ' 题 · ' + answeredCount + ' 题已作答</span>' +
        '</div>' +
      '</div>';
    });
    
    historyList.innerHTML = html;
  } catch (e) {
    console.error('[app.js] 加载练习历史失败', e);
  }
}

async function clearPracticeHistory() {
  if (!confirm('确定要清空所有练习历史记录吗？')) return;
  
  try {
    await StateManager.clearPracticeHistory();
    loadPracticeHistory();
    showToast('练习历史已清空');
  } catch (e) {
    console.error('[app.js] 清空练习历史失败', e);
  }
}

function viewPracticeDetail(recordId) {
  // TODO: 实现查看练习详情功能
  showToast('练习详情功能开发中...');
}

// === Stats ===
function updateStats() {
  if (!state.knowledge) return;
  var total = state.knowledge.points.length;
  var mastered = 0, fuzzy = 0;
  state.knowledge.points.forEach(function(p) {
    var m = getMastery(p.id);
    if (m === 'mastered') mastered++;
    if (m === 'fuzzy') fuzzy++;
  });

  document.getElementById('math-mastered').textContent = mastered;
  document.getElementById('math-progress').style.width = total > 0 ? Math.round(mastered / total * 100) + '%' : '0%';
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-mastered').textContent = mastered;
  document.getElementById('stat-fuzzy').textContent = fuzzy;
  document.getElementById('stat-rate').textContent = total > 0 ? Math.round(mastered / total * 100) + '%' : '0%';

  // 更新用户 ID 显示（显示后 6 位）
  try {
    const userId = StateManager.getUserId();
    const displayId = document.getElementById('display-user-id');
    if (userId && userId.length >= 6) {
      displayId.textContent = userId.slice(-6);
      displayId.title = userId; // 鼠标悬停显示完整 ID
    } else {
      displayId.textContent = userId || '未知';
    }
  } catch (e) {
    console.error('[app.js] 获取用户 ID 失败:', e);
  }

  // 更新上次导出时间显示
  updateExportInfo();
}

// 更新导出信息显示
function updateExportInfo() {
  try {
    StateManager.getLastExportTime().then(timestamp => {
      const exportInfo = document.getElementById('export-info');
      const lastExportSpan = document.getElementById('last-export-time');
      const reminderSpan = document.getElementById('export-reminder');

      if (timestamp) {
        const date = new Date(timestamp);
        lastExportSpan.textContent = date.toLocaleString('zh-CN');
        exportInfo.style.display = 'block';

        // 检查是否需要提醒导出（超过7天）
        const now = Date.now();
        const daysSinceExport = (now - timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceExport > 7) {
          reminderSpan.style.display = 'inline';
        } else {
          reminderSpan.style.display = 'none';
        }
      } else {
        lastExportSpan.textContent = '从未导出';
        exportInfo.style.display = 'block';
        reminderSpan.style.display = 'inline';
      }
    }).catch(e => {
      console.error('[app.js] updateExportInfo Promise failed:', e);
    });
  } catch (e) {
    console.error('[app.js] updateExportInfo failed:', e);
  }
}

// === Weak Points ===
async function addToWeakPoints(id) {
  try {
    const weakPoints = await StateManager.getWeakPoints();
    if (!weakPoints.includes(id)) {
      weakPoints.push(id);
      await StateManager.saveAllWeak(weakPoints);
      showToast('已加入薄弱点列表');
    } else {
      showToast('已在薄弱点列表中');
    }
  } catch (e) {
    console.error('[app.js] addToWeakPoints failed:', e);
  }
}

// === Toast ===
function showToast(msg) {
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 1800);
}
