# 工程方案评审：Lumos 英语错题智能训练系统

> **项目**: Lumos 学习系统  
> **版本**: 1.0 (工程评审)  
> **日期**: 2026-07-11  
> **对应 PRD**: `lumos/PRD-英语错题管理与AI练习系统.md` v2.1  
> **评审对象**: 工程师 workHy + 质量门禁 codeG  
> **审阅人**: skyone (Product Owner)

---

## 0. 评审目的

在工程团队（workHy）正式动手之前，**对齐以下内容**：

1. **架构决策**：模块划分、技术栈选择、第三方依赖
2. **数据模型**：VocabErrorRecord / Batch / TrainingRecord 的字段、命名空间
3. **核心算法**：错因自动识别、训练模式生成、间隔重复
4. **硬约束实现**：10 分钟上限、鼓励式反馈、错答不显示错误
5. **风险预案**：数据迁移、容量、隐私
6. **Phase 1.0 范围**：明确 v0.1 必须做、延后做、不做的

**评审通过标准**：
- ✅ 工程团队对"做哪些"有共识
- ✅ 对"10 分钟硬上限"等关键设计有清晰实现方案
- ✅ 风险被识别并有预案
- ✅ Phase 1.0 范围被严格控制（不大跃进）

---

## 1. 架构总览

### 1.1 模块定位

```
Lumos 英语模块（改造升级）
  │
  ├── 📚 现有：Unit 7 情景对话（保留，向后兼容）
  │     └── 5 个场景，背诵+练习模式（不动）
  │
  └── 🆕 新增：词汇错题智能训练（v0.1 主要工作）
        │
        ├── 错题数据层
        │     ├── vocab-error-store.js     错题 CRUD（基于 localStorage）
        │     ├── batch-store.js           批次管理
        │     ├── training-record-store.js 训练历史
        │     └── error-classifier.js      错因自动识别（关键词匹配）
        │
        ├── 训练引擎层
        │     ├── training-engine.js       训练调度（推荐、流程控制）
        │     ├── training-modes/          5 个训练模式
        │     │     ├── spelling-camp.js
        │     │     ├── flash-war.js
        │     │     ├── confusion-battle.js
        │     │     ├── from-zero.js
        │     │     └── review-wall.js
        │     └── spaced-repetition.js    间隔重复算法
        │
        ├── UI 层
        │     ├── pages/                  页面
        │     │     ├── home.html         首页（今日训练 + 上周战报）
        │     │     ├── import.html       爸爸模式：批量导入
        │     │     ├── training.html     训练页面（5 模式共用）
        │     │     ├── review.html       错题复盘墙
        │     │     └── dad-mode.html     爸爸模式首页
        │     ├── components/
        │     │     ├── word-card.js      单词展示卡片
        │     │     ├── feedback.js       鼓励式反馈组件
        │     │     └── timer.js          10 分钟硬上限计时器
        │     └── style.css
        │
        └── 工具层
              ├── tsv-parser.js          Excel 复制粘贴解析
              ├── offline-test-export.js 本周默写清单导出
              └── dad-mode-guard.js      爸爸模式权限保护
```

### 1.2 路由设计

**v0.1 单页 + 锚点导航**（不上框架，保持 Lumos 一致风格）：

| URL / Hash | 页面 | 默认用户 |
|----------|------|---------|
| `/lumos/english/` | 英语首页（Unit 7 情景对话入口） | 诗颖 |
| `/lumos/english/?tab=vocab` | **词汇训练首页**（今日训练按钮） | 诗颖 |
| `/lumos/english/?tab=vocab&mode=spelling` | 拼写特训营 | 诗颖 |
| `/lumos/english/?tab=vocab&mode=flash` | 词汇闪电战 | 诗颖 |
| `/lumos/english/?tab=vocab&mode=confusion` | 混淆词大作战 | 诗颖 |
| `/lumos/english/?tab=vocab&mode=zero` | 从零学词 | 诗颖 |
| `/lumos/english/?tab=review` | 错题复盘墙 | 诗颖 |
| `/lumos/english/?tab=dad` | **爸爸模式**（需密码） | 爸爸 |
| `/lumos/english/?tab=dad&action=import` | 批量导入 | 爸爸 |
| `/lumos/english/?tab=dad&action=export` | 导出本周默写清单 | 爸爸 |
| `/lumos/english/?tab=dad&action=offline-result` | 线下成绩录入 | 爸爸 |

### 1.3 技术栈（沿用现有）

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 纯静态（HTML + CSS + JS） | 无框架，GitHub Pages 直接托管 |
| 数据 | localStorage | 5MB 容量，单用户足够 |
| 公式/音标 | 不用 KaTeX（英语不需要公式渲染） | 直接展示 IPA 字符 |
| 部署 | GitHub Pages | main 分支自动构建 |
| 测试 | 浏览器手动测试 + 单元测试（错因识别） | 简单 JS 单元测试 |

**不引入**：
- ❌ 后端服务（v0.1 不需要）
- ❌ 数据库（localStorage 够用）
- ❌ 任何前端框架（React/Vue）— Lumos 一直是无框架风格
- ❌ LLM API（v0.1 不出题用 LLM）

---

## 2. 数据模型（详细）

### 2.1 命名空间规范

```
lumos:english:vocab:error:{wordId}      # 单条错题
lumos:english:vocab:error-index          # 所有错题 ID 的索引数组
lumos:english:vocab:batch:{batchId}      # 批次元数据
lumos:english:vocab:batch-index          # 批次 ID 索引
lumos:english:vocab:training:{recordId}  # 训练记录
lumos:english:vocab:offline:{testId}     # 线下默写记录
lumos:english:vocab:meta                 # 模块级元数据（今日训练、上次打开等）
lumos:english:vocab:dad-password         # 爸爸模式密码（哈希存储）
```

**重要**：复用现有 `lumos:english:mastery:*` 命名空间**不冲突**——那是 Unit 7 场景的，新的命名空间是 `vocab:` 隔离的。

### 2.2 VocabErrorRecord（错题记录）

```javascript
{
  id: "ve-7A-U2-wednesday-001",          // 唯一 ID
  word: "Wednesday",                     // 主键
  phonetic: "ˈwenzdeɪ",                  // 音标
  meaning: "星期三",                      // 中文释义
  meaningPartOfSpeech: "n.",            // 自动从释义解析（*n*./*v*.）
  wrongAnswer: "wesneday",               // 诗颖的错误版本（可选）
  errorCategory: "spelling_missing",     // 错因大类（14 种）
  errorSubType: "missing_letter_d",      // 错因子类
  errorNote: "missed letter 'd'",        // 具体描述
  confusedWith: null,                    // 混淆类填混淆词
  memoryTip: "Wed-nes-day 拆三音节",     // 来自答案版"提示"列
  exampleSentence: null,                 // 词典/未来 LLM 补充
  unitSource: "7A-U2-WU",               // 来源单元
  batchId: "batch-2026-07-11",          // 批次号
  isHistoryImport: true,                 // 是否历史导入

  // 状态字段
  status: "pending",                     // pending | practicing | mastered
  masteryLevel: 0,                       // 0-100，间隔重复算法
  errorCount: 1,                         // 累计错误次数（多批次叠加）
  lastPracticedAt: null,                 // ISO 8601
  lastOfflineTestAt: null,               // 最后线下默写时间
  nextReviewDate: "2026-07-12",          // 间隔重复算出

  createdAt: "2026-07-11T15:30:00Z",
  updatedAt: "2026-07-11T15:30:00Z"
}
```

### 2.3 Batch（批次）

```javascript
{
  batchId: "batch-2026-07-11",
  source: "offline_dictation",           // offline_dictation | exercise | test
  subject: "english",
  contentType: "word",                   // word | phrase | verb_usage
  importedAt: "2026-07-11T16:00:00Z",
  importer: "skyone",
  totalImported: 231,
  duplicatesSkipped: 0,
  errorDistribution: {
    unlearned: 135,
    spelling: 51,
    confusion: 10,
    grammar: 8,
    format: 4,
    other: 23
  },
  unitRange: "七上 Unit 1-6"             // 自由文本
}
```

### 2.4 TrainingRecord（训练记录）

```javascript
{
  recordId: "tr-2026-07-12-001",
  errorId: "ve-7A-U2-wednesday-001",
  trainingMode: "spelling_camp",         // spelling_camp | flash_war | confusion_battle | from_zero | review
  date: "2026-07-12T16:30:00Z",
  duration: 28,                          // 秒
  isCorrect: true,
  myAnswer: "Wednesday",
  hint: null,                            // 是否用了提示
  retries: 0                             // 错了重答的次数
}
```

### 2.5 OfflineTestRecord（线下默写）

```javascript
{
  testId: "ot-2026-07-13",
  date: "2026-07-13T10:00:00Z",
  testSet: "weekly_2026-07-08_to_07-14",
  results: [
    { wordId: "ve-7A-U2-wednesday-001", isCorrect: true },
    { wordId: "ve-7A-U2-restaurant-001", isCorrect: false, wrongAnswer: "restrant" }
  ],
  score: 8,                              // 8/10
  totalCount: 10,
  reviewer: "skyone"
}
```

### 2.6 Meta（模块级状态）

```javascript
{
  key: "meta",
  data: {
    lastTrainingDate: "2026-07-12",
    todayTrainingCount: 0,                // 今日已用次数
    todayTrainingSeconds: 0,              // 今日已用秒数
    lastImportDate: "2026-07-11",
    lastOfflineTestDate: "2026-07-13",
    // 间隔重复算法用
    reviewQueue: ["word-id-1", ...]      // 待复习队列
  }
}
```

### 2.7 容量估算

| 数据 | 数量 | 单条大小 | 总大小 |
|------|------|---------|--------|
| VocabErrorRecord | 500 条（v1 估计） | ~500B | 250KB |
| Batch | 10 批 | ~300B | 3KB |
| TrainingRecord | 100 条/天 × 30 天 = 3000 | ~200B | 600KB |
| OfflineTestRecord | 4 条/月 | ~500B | 2KB |
| Meta | 1 条 | ~500B | 0.5KB |
| **合计** | | | **~860KB** |

✅ 远低于 localStorage 5MB 限制。**即使叠加八年级 + 词组 + 动词（估计共 1000+ 词），仍然在 2MB 以内**。

---

## 3. 错因自动识别（核心算法）

### 3.1 识别策略：关键词匹配 + 规则兜底

```javascript
// error-classifier.js

const KEYWORD_RULES = [
  // 未学会类
  { category: 'unlearned', subType: null,
    match: (note, wrong) => !wrong || wrong === '(未填)' || wrong === '',
    confidence: 0.95 },
  
  // 漏字母
  { category: 'spelling', subType: 'spelling_missing',
    match: (note) => /漏字母|漏一个|漏了|missed|missing/i.test(note),
    confidence: 0.9 },
  
  // 多字母
  { category: 'spelling', subType: 'spelling_extra',
    match: (note) => /多|加了|多了|多了个|多了s|多了一个|extra/i.test(note),
    confidence: 0.85 },
  
  // 字母顺序
  { category: 'spelling', subType: 'spelling_order',
    match: (note) => /顺序|颠倒|order/i.test(note),
    confidence: 0.9 },
  
  // 元音替换
  { category: 'spelling', subType: 'spelling_substitution',
    match: (note) => /元音|替换|a→o|i→e|ea→|ou代替|子音/i.test(note),
    confidence: 0.85 },
  
  // 首尾字母
  { category: 'spelling', subType: 'spelling_edge',
    match: (note) => /首字母|末尾|结尾|开头/i.test(note),
    confidence: 0.8 },
  
  // 英美差异
  { category: 'spelling', subType: 'spelling_uk_us',
    match: (note) => /英式|美式|英美|uk|us/i.test(note),
    confidence: 0.95 },
  
  // 完全写错
  { category: 'spelling', subType: 'spelling_wrong',
    match: (note) => /完全|全错|错乱|拼写错|写错/i.test(note),
    confidence: 0.8 },
  
  // 词义混淆
  { category: 'confusion', subType: 'confusion_semantic',
    match: (note) => /混淆|近词|近形|近音|弄混/i.test(note),
    confidence: 0.85 },
  
  // 主宾格
  { category: 'grammar', subType: 'grammar_case',
    match: (note) => /主宾|主格|宾格/i.test(note),
    confidence: 0.95 },
  
  // 词性
  { category: 'grammar', subType: 'grammar_pos',
    match: (note) => /词性|名词|动词|形容词/i.test(note),
    confidence: 0.7 },
  
  // 大小写
  { category: 'format', subType: 'format_capitalization',
    match: (note) => /大写|首字母大写|capital/i.test(note),
    confidence: 0.95 },
  
  // 缩写
  { category: 'format', subType: 'format_abbreviation',
    match: (note) => /缩写|abbreviation/i.test(note),
    confidence: 0.9 }
];

function classifyError(errorNote, wrongAnswer) {
  // 1. 优先级：未填写（置信度最高）
  if (!wrongAnswer || wrongAnswer === '(未填)' || wrongAnswer === '') {
    return { category: 'unlearned', subType: null, confidence: 0.95, autoDetected: true };
  }
  
  // 2. 关键词匹配
  for (const rule of KEYWORD_RULES) {
    if (rule.match(errorNote || '', wrongAnswer)) {
      return {
        category: rule.category,
        subType: rule.subType,
        confidence: rule.confidence,
        autoDetected: true
      };
    }
  }
  
  // 3. 兜底：未识别
  return {
    category: 'other',
    subType: null,
    confidence: 0,
    autoDetected: false,
    needsReview: true  // 让爸爸确认
  };
}
```

### 3.2 置信度阈值与人工确认

- 置信度 ≥ 0.85：自动归类
- 置信度 0.7-0.85：自动归类，但标"需你确认"（下次进入错题列表时可一键改）
- 置信度 < 0.7：归到 `other`，**必须爸爸手动选 1 次**（后续复用）

### 3.3 词性自动解析

从 `meaning` 字段提取（你答案版里是 `*n*.` `*v*.` 格式）：

```javascript
function parsePartOfSpeech(meaning) {
  const match = meaning.match(/\*([nvai])\*\./);
  if (match) {
    const map = { n: 'n.', v: 'v.', a: 'adj.', i: 'int.' };
    return map[match[1]] || null;
  }
  return null;
}
```

---

## 4. 训练模式实现（5 个模式）

### 4.1 通用框架

每个训练模式都是一个 JS 模块，实现统一接口：

```javascript
// training-modes/base.js
class BaseTrainingMode {
  constructor(config) {
    this.mode = config.mode;              // 'spelling_camp' 等
    this.name = config.name;              // '拼写特训营'
    this.icon = config.icon;              // '🎯'
    this.estimatedDuration = 5 * 60;      // 默认 5 分钟
  }
  
  // 核心方法：获取该模式的训练题目
  async getQuestions(errorRecords, count = 5) {
    // 由子类实现
  }
  
  // 检查答案（鼓励式反馈，不显示"哪里错"）
  checkAnswer(question, userAnswer) {
    return {
      isCorrect: true|false,
      // 不返回 correctAnswer（避免"对了才显示"）
      // 但允许用户在错答时主动点击"看答案"
    };
  }
  
  // 错答时显示的内容（鼓励式）
  getWrongAnswerDisplay(question) {
    return {
      emoji: "😊",
      message: "没关系，下次记住就好~",
      showCorrectAnswer: true,            // 显示正确答案
      showHintButton: true,               // 显示"看提示"按钮
      showSkipButton: true                // 显示"下一题"按钮
    };
  }
}
```

### 4.2 模式 1：拼写特训营（spelling-camp.js）

```javascript
class SpellingCamp extends BaseTrainingMode {
  constructor() {
    super({
      mode: 'spelling_camp',
      name: '拼写特训营',
      icon: '🎯',
      estimatedDuration: 5 * 60
    });
  }
  
  // 只针对拼写类错题
  async getQuestions(errorRecords, count = 5) {
    const spellingErrors = errorRecords.filter(
      e => e.errorCategory === 'spelling' && e.status !== 'mastered'
    );
    
    return spellingErrors.slice(0, count).map(err => ({
      errorId: err.id,
      type: 'spelling',
      prompt: {
        phonetic: err.phonetic,
        meaning: err.meaning,
        partOfSpeech: err.meaningPartOfSpeech
      },
      // 不展示"缺失字母"等"指出错误"的内容
      correctAnswer: err.word,
      userAnswer: null
    }));
  }
  
  checkAnswer(question, userAnswer) {
    // 模糊匹配（不区分大小写、去空格）
    const normalized = userAnswer.toLowerCase().trim();
    return {
      isCorrect: normalized === question.correctAnswer.toLowerCase()
    };
  }
}
```

### 4.3 模式 2：词汇闪电战（flash-war.js）

```javascript
class FlashWar extends BaseTrainingMode {
  constructor() {
    super({
      mode: 'flash_war',
      name: '词汇闪电战',
      icon: '⚡',
      estimatedDuration: 5 * 60
    });
  }
  
  // 针对"未学会"类（最大头）
  async getQuestions(errorRecords, count = 10) {
    const unlearned = errorRecords.filter(
      e => e.errorCategory === 'unlearned' && e.status !== 'mastered'
    );
    
    return unlearned.slice(0, count).map(err => ({
      errorId: err.id,
      type: 'unlearned',
      prompt: {
        meaning: err.meaning,
        phonetic: err.phonetic
      },
      correctAnswer: err.word,
      // v2.1：限时是可选模式，默认无限时
      timer: null  // 由用户选择"无限时模式"（默认）或"闪电挑战"（5秒）
    }));
  }
}
```

### 4.4 模式 3：混淆词大作战（confusion-battle.js）

```javascript
class ConfusionBattle extends BaseTrainingMode {
  constructor() {
    super({
      mode: 'confusion_battle',
      name: '混淆词大作战',
      icon: '🔀',
      estimatedDuration: 4 * 60
    });
  }
  
  // 从错题中自动配对混淆词
  async getQuestions(errorRecords, count = 3) {
    const confusionErrors = errorRecords.filter(
      e => e.errorCategory === 'confusion' && e.status !== 'mastered'
    );
    
    // 配对算法：
    // 1. 如果有 confusedWith 字段，直接配对
    // 2. 否则按"近音/近形"配对（最长公共前缀 > 3 字符）
    const pairs = this.pairConfusionWords(confusionErrors);
    
    return pairs.slice(0, count).map(pair => ({
      type: 'confusion',
      pair: pair.words,
      // 生成语境题（硬编码 5 个常见句型）
      generateQuestion: () => this.generateContextQuestion(pair)
    }));
  }
  
  generateContextQuestion(pair) {
    // 例如: sale/sell → "The store is having a big ___ this weekend"
    // 词库硬编码
    const templates = {
      'sale-sell': {
        sentence: 'The store is having a big __________ this weekend.',
        answer: 'sale',
        options: ['sale', 'sell']
      }
      // ... 更多混淆对
    };
    return templates[`${pair.words[0]}-${pair.words[1]}`] || this.fallback(pair);
  }
}
```

### 4.5 模式 4：从零学词（from-zero.js）

```javascript
class FromZero extends BaseTrainingMode {
  constructor() {
    super({
      mode: 'from_zero',
      name: '从零学词',
      icon: '🧱',
      estimatedDuration: 4 * 60
    });
  }
  
  // 针对"完全写错"类
  async getQuestions(errorRecords, count = 3) {
    const wrongErrors = errorRecords.filter(
      e => e.errorSubType === 'spelling_wrong' && e.status !== 'mastered'
    );
    
    return wrongErrors.slice(0, count).map(err => ({
      errorId: err.id,
      type: 'from_zero',
      word: err.word,
      phonetic: err.phonetic,
      meaning: err.meaning,
      // 拆音节（用 JS 函数自动拆，兜底用预定义）
      syllables: this.splitSyllables(err.word),
      // 关联已知词（从"已掌握"列表里找相似双写词）
      relatedWords: this.findRelatedWords(err.word, errorRecords)
    }));
  }
  
  splitSyllables(word) {
    // 简单规则：每 2-3 字母一段
    // 未来可用 hyphenation.js 库
    const result = [];
    for (let i = 0; i < word.length; i += 2) {
      result.push({ hint: '_'.repeat(Math.min(2, word.length - i)) });
    }
    return result;
  }
}
```

### 4.6 模式 5：错题复盘墙（review-wall.js）

```javascript
// 不是训练模式，是周报渲染器
class ReviewWall {
  async render(weekRange) {
    const trainingRecords = await this.getWeekTraining(weekRange);
    const masteredCount = await this.getMasteredCount(weekRange);
    const offlineScore = await this.getOfflineScore(weekRange);
    
    return {
      // v2.1：只展示"做到了什么"
      highlights: {
        masteredWords: masteredCount,            // 已掌握 N 个
        newFriends: masteredCount,               // 用了"朋友"的话术
        offlineCorrectRate: `${offlineScore.correct}/${offlineScore.total}`,
        // ❌ 不展示: 错误率、待复习、未掌握
      },
      // v2.1：本周精彩瞬间（不是"下周挑战"）
      weekHighlights: this.getWeekHighlights(trainingRecords),
      // 爸爸的话（爸爸在导入时设置）
      dadMessage: await this.getDadMessage()
    };
  }
}
```

---

## 5. 间隔重复算法

### 5.1 v0.1 简化版（基于 masteryLevel）

```javascript
// spaced-repetition.js

const REVIEW_INTERVALS = {
  0: 0,        // 0-30% → 立即（明天）
  30: 3,       // 30-60% → 3 天后
  60: 7,       // 60-80% → 7 天后
  80: 30       // 80-100% → 30 天后
};

function getNextReviewDate(masteryLevel) {
  const thresholds = Object.keys(REVIEW_INTERVALS).map(Number).sort((a, b) => b - a);
  for (const threshold of thresholds) {
    if (masteryLevel >= threshold) {
      const days = REVIEW_INTERVALS[threshold];
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);
      return nextDate.toISOString().split('T')[0];
    }
  }
  return new Date().toISOString().split('T')[0];
}

function updateMastery(record, wasCorrect, responseTime) {
  let level = record.masteryLevel || 0;
  
  if (wasCorrect) {
    // v2.1：答对增加掌握度（但更平缓）
    if (responseTime < 3) level += 20;       // 3 秒内答对
    else if (responseTime < 10) level += 15;  // 10 秒内答对
    else level += 10;                          // 慢慢想答对
  } else {
    // v2.1：答错不归零（关键变更）
    // 旧版: level = 0;
    level = Math.max(0, level - 10);  // 答错只减 10
  }
  
  return Math.min(100, level);
}
```

### 5.2 训练队列生成

```javascript
async function generateTodayQueue() {
  const allErrors = await vocabErrorStore.getAll();
  const today = new Date().toISOString().split('T')[0];
  
  // 优先级排序：
  // 1. 到期复习（nextReviewDate <= today）
  // 2. 从未练习的（lastPracticedAt === null）
  // 3. 最近 3 天新增的
  const queue = allErrors
    .filter(e => e.status !== 'mastered')
    .sort((a, b) => {
      // 优先级评分
      const scoreA = calculatePriority(a, today);
      const scoreB = calculatePriority(b, today);
      return scoreB - scoreA;
    });
  
  return queue.slice(0, 15);  // v2.1：默认 1 个模式取 5-10 题，不超 15
}

function calculatePriority(error, today) {
  let score = 0;
  if (error.nextReviewDate <= today) score += 100;  // 到期
  if (!error.lastPracticedAt) score += 50;          // 从未练
  if (error.errorCount > 1) score += 20;            // 多次错
  if (error.status === 'practicing') score += 10;   // 进行中
  return score;
}
```

---

## 6. 硬约束实现（关键！）

### 6.1 10 分钟硬上限

```javascript
// components/timer.js

class TrainingTimer {
  constructor(onTimeout) {
    this.startTime = Date.now();
    this.duration = 10 * 60 * 1000;  // 10 分钟
    this.intervalId = null;
    this.onTimeout = onTimeout;
  }
  
  start() {
    this.checkInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const remaining = this.duration - elapsed;
      
      if (remaining <= 0) {
        this.triggerTimeout();
      } else if (remaining <= 60 * 1000) {
        // 最后一分钟温柔提示
        showToast("🌸 还有 1 分钟哦~");
      }
    }, 1000);
  }
  
  triggerTimeout() {
    // ❌ 不允许"再练一会儿"的选项
    showModal({
      title: "🌸 今天的训练时间到啦~",
      body: "你今天已经练习了 10 分钟，要不要休息一下？\n明天再继续也很好哦~",
      actions: [
        { label: "好的，明天见", primary: true },
        { label: "再玩 1 个", onClick: () => this.allowOneMore() }
      ]
    });
    // 即使点"再玩 1 个"，也只允许 3 分钟（防止无限）
  }
  
  allowOneMore() {
    this.duration = 3 * 60 * 1000;
    this.startTime = Date.now();
    showToast("🌸 再玩 3 分钟~到时间真的要休息哦~");
  }
}
```

### 6.2 错答不显示"哪里错"

```javascript
// components/feedback.js

class EncouragementFeedback {
  showCorrect(question) {
    return {
      emoji: pickRandom(['🌟', '⭐', '🎉', '👏', '💪', '✨']),
      message: pickRandom([
        '你又认识一个词！加油！',
        '🌈 太棒了！你真厉害！',
        '💖 这个词也成为你的朋友了~',
        '🌟 你和这个词已经成为朋友啦'
      ]),
      correctAnswer: null,  // 答对时不显示答案
      showNextButton: true
    };
  }
  
  showWrong(question, userAnswer) {
    return {
      emoji: '😊',
      message: '没关系，下次记住就好~',
      correctAnswer: question.correctAnswer,  // 显示但不说"你哪里错了"
      // ❌ 不显示: highlightMissingLetters, errorPosition
      showHintButton: true,                    // 让用户**主动**选
      showSkipButton: true,
      options: [
        { label: '再试一次', onClick: () => retry(question) },
        { label: '看答案', onClick: () => showAnswer(question) },
        { label: '下一题', onClick: () => next() }
      ]
    };
  }
}
```

### 6.3 "不练了"不挽留

```javascript
// 任何"暂停"按钮
function handlePauseRequest() {
  // ❌ 不显示："你还有 N 题没做哦"
  // ❌ 不显示："再坚持一下"
  showModal({
    title: "好的~",
    body: "今天的学习时间到啦~",
    actions: [
      { label: '明天见', primary: true }
      // 只有这一个选项
    ]
  });
  
  // 自动保存进度
  saveTrainingProgress();
}
```

---

## 7. 爸爸模式实现

### 7.1 权限保护

```javascript
// dad-mode-guard.js

const DAD_PASSWORD_KEY = 'lumos:english:vocab:dad-password';

function setDadPassword(password) {
  // 简单哈希（v0.1，不上 bcrypt）
  const hash = btoa(password + 'lumos-salt-2026');
  localStorage.setItem(DAD_PASSWORD_KEY, hash);
}

function verifyDadPassword(password) {
  const stored = localStorage.getItem(DAD_PASSWORD_KEY);
  return stored === btoa(password + 'lumos-salt-2026');
}

// 初次进入爸爸模式时，引导设置密码
// 后续进入时，密码框
```

### 7.2 批量导入（Excel/CSV 解析）

**输入格式**（从 Excel 复制粘贴为 TSV）：

```
word\tphonetic\tmeaning\twrongAnswer\terrorNote
Wednesday\tˈwenzdeɪ\t星期三\twesneday\t漏字母 d
colourful\tˈkʌləf(ə)l\t丰富多彩的\tcolorful\t英式美式
```

**解析逻辑**：

```javascript
// tsv-parser.js

function parseTSV(tsvText) {
  const lines = tsvText.trim().split('\n');
  const records = [];
  
  // 1. 检测表头
  const headerLine = lines[0].toLowerCase();
  let hasHeader = headerLine.includes('word') || headerLine.includes('单词');
  let startIdx = hasHeader ? 1 : 0;
  
  // 2. 解析每行
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;  // 跳过空行
    
    const [word, phonetic, meaning, wrongAnswer, errorNote] = cols;
    
    if (!word) continue;
    
    records.push({
      word: word.trim(),
      phonetic: (phonetic || '').trim(),
      meaning: (meaning || '').trim(),
      wrongAnswer: (wrongAnswer || '').trim(),
      errorNote: (errorNote || '').trim()
    });
  }
  
  return records;
}
```

**导入流程**：

```javascript
async function importErrors(tsvText, batchMeta) {
  const records = parseTSV(tsvText);
  const result = { imported: 0, duplicates: 0, needsReview: 0 };
  
  for (const record of records) {
    // 1. 检查重复
    const existing = await vocabErrorStore.getByWord(record.word);
    if (existing) {
      // 累计 errorCount
      existing.errorCount++;
      existing.updatedAt = new Date().toISOString();
      await vocabErrorStore.update(existing);
      result.duplicates++;
      continue;
    }
    
    // 2. 自动错因识别
    const classification = classifyError(record.errorNote, record.wrongAnswer);
    
    // 3. 构建完整记录
    const fullRecord = {
      id: `ve-${batchMeta.batchId}-${record.word.toLowerCase()}`,
      ...record,
      meaningPartOfSpeech: parsePartOfSpeech(record.meaning),
      errorCategory: classification.category,
      errorSubType: classification.subType,
      classificationConfidence: classification.confidence,
      needsReview: classification.needsReview,
      batchId: batchMeta.batchId,
      isHistoryImport: true,
      status: 'pending',
      masteryLevel: 0,
      errorCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await vocabErrorStore.create(fullRecord);
    result.imported++;
    if (classification.needsReview) result.needsReview++;
  }
  
  // 4. 保存批次元数据
  await batchStore.create({
    ...batchMeta,
    totalImported: result.imported,
    duplicatesSkipped: result.duplicates
  });
  
  return result;
}
```

### 7.3 本周默写清单导出

```javascript
// offline-test-export.js

async function exportWeeklyTestSet() {
  const queue = await generateTodayQueue();
  // 选 20-30 个最该练的
  const testWords = queue.slice(0, 25);
  
  // TSV 格式：音标 / 释义 / 留空
  const tsv = ['音标\t释义\t单词（填写）'];
  for (const word of testWords) {
    tsv.push(`${word.phonetic}\t${word.meaning}\t`);
  }
  
  // 复制到剪贴板
  const text = tsv.join('\n');
  await navigator.clipboard.writeText(text);
  
  showToast('📋 已复制到剪贴板，粘贴到 Excel 即可');
  
  return { testSetId: `weekly-${getWeekId()}`, words: testWords };
}
```

### 7.4 线下成绩录入

```javascript
async function recordOfflineResult(testSetId, results) {
  // results: [{ wordId, isCorrect, wrongAnswer? }]
  const testRecord = {
    testId: `ot-${Date.now()}`,
    date: new Date().toISOString(),
    testSet: testSetId,
    results,
    score: results.filter(r => r.isCorrect).length,
    totalCount: results.length,
    reviewer: 'skyone'
  };
  
  await offlineStore.create(testRecord);
  
  // 反向更新错题状态
  for (const result of results) {
    const err = await vocabErrorStore.getById(result.wordId);
    if (!err) continue;
    
    err.lastOfflineTestAt = new Date().toISOString();
    if (result.isCorrect) {
      err.offlineCorrectCount = (err.offlineCorrectCount || 0) + 1;
    } else {
      err.offlineWrongCount = (err.offlineWrongCount || 0) + 1;
    }
    await vocabErrorStore.update(err);
  }
  
  return testRecord;
}
```

---

## 8. UI 页面（v0.1 范围）

### 8.1 词汇训练首页（home）

```html
<!-- ?tab=vocab -->
<div class="vocab-home">
  <!-- 顶部：欢迎语 + 今日训练时间（已用/总） -->
  <div class="welcome">
    <h1>💖 嗨，诗颖！</h1>
    <p>今天想练点什么？</p>
    <div class="time-budget">
      ⏱️ 今日已用: <span id="today-seconds">0</span> / 10:00
    </div>
  </div>
  
  <!-- 主按钮：今日训练（只展示 1 个推荐模式） -->
  <button class="primary-btn" id="start-training">
    <span class="emoji">🎯</span>
    开始今天的训练
    <span class="hint">推荐 5 分钟</span>
  </button>
  
  <!-- 次要：其他 4 个模式（小卡片，可选） -->
  <div class="other-modes">
    <p>其他训练（可选）</p>
    <div class="mode-grid">
      <div class="mode-mini" data-mode="spelling">🎯 拼写特训营</div>
      <div class="mode-mini" data-mode="flash">⚡ 词汇闪电战</div>
      <div class="mode-mini" data-mode="confusion">🔀 混淆词大作战</div>
      <div class="mode-mini" data-mode="zero">🧱 从零学词</div>
    </div>
  </div>
  
  <!-- 上周战报（缩略） -->
  <div class="mini-review">
    <h3>💖 你上周真棒！</h3>
    <p>已掌握 12 个新朋友 ✨</p>
    <a href="?tab=review">查看详细战报 →</a>
  </div>
</div>
```

### 8.2 训练页面（training）

```html
<!-- ?tab=vocab&mode=spelling -->
<div class="training-page">
  <!-- 顶部进度条 -->
  <div class="training-header">
    <div class="mode-name">🎯 拼写特训营</div>
    <div class="progress">3 / 5 ⭐⭐⭐</div>
    <div class="time-remaining">⏱️ 9:30</div>
  </div>
  
  <!-- 单词卡片 -->
  <div class="word-card">
    <div class="phonetic">/ˈwenzdeɪ/</div>
    <div class="meaning">星期三</div>
    <div class="pos">n.</div>
    <input type="text" class="word-input" placeholder="在这里输入...">
    <div class="hint-area">
      <button class="hint-btn">💡 想要看看小提示吗？</button>
    </div>
  </div>
  
  <!-- 反馈区（错答时才显示） -->
  <div class="feedback hidden" id="feedback">
    <div class="emoji">😊</div>
    <div class="message">没关系，下次记住就好~</div>
    <div class="correct-answer">正确答案: Wednesday</div>
    <div class="options">
      <button onclick="retry()">再试一次</button>
      <button onclick="next()">下一题 →</button>
    </div>
  </div>
  
  <!-- 底部控制 -->
  <div class="controls">
    <button onclick="pause()">⏸️ 暂停</button>
    <button onclick="showEndDialog()">✅ 完成了</button>
  </div>
</div>
```

### 8.3 爸爸模式首页（dad-mode）

```html
<!-- ?tab=dad -->
<div class="dad-mode">
  <h2>👨 爸爸模式</h2>
  
  <div class="dad-actions">
    <div class="action-card" onclick="goImport()">
      <div class="emoji">📥</div>
      <div class="title">批量导入错题</div>
      <div class="desc">从 Excel 粘贴错题，一次性导入系统</div>
    </div>
    
    <div class="action-card" onclick="goExport()">
      <div class="emoji">📋</div>
      <div class="title">导出本周默写清单</div>
      <div class="desc">基于薄弱点生成 20-30 词的默写表</div>
    </div>
    
    <div class="action-card" onclick="goOfflineResult()">
      <div class="emoji">✏️</div>
      <div class="title">录入线下默写成绩</div>
      <div class="desc">标记对/错，让系统知道掌握情况</div>
    </div>
    
    <div class="action-card" onclick="goReview()">
      <div class="emoji">📊</div>
      <div class="title">查看女儿战报</div>
      <div class="desc">了解本周/本月进步情况</div>
    </div>
  </div>
  
  <!-- 数据管理 -->
  <div class="data-mgmt">
    <h3>数据</h3>
    <p>已导入: 231 个错词 | 训练记录: 12 条 | 线下默写: 3 次</p>
    <button onclick="exportAllData()">📦 导出全部数据（备份）</button>
    <button onclick="confirmReset()">🔄 重置全部数据（危险）</button>
  </div>
</div>
```

---

## 9. Phase 1.0 范围（严格控制）

### 9.1 v0.1 必须做

| # | 功能 | 文件 | 估时（工程师人时） |
|---|------|------|------------------|
| 1 | 错因自动识别算法 + 单元测试 | `error-classifier.js` | 2 |
| 2 | 数据存储层（CRUD + 命名空间） | `vocab-error-store.js` 等 4 个 | 3 |
| 3 | TSV 解析器 | `tsv-parser.js` | 1 |
| 4 | 批量导入 UI + 流程 | `import.html` | 2 |
| 5 | 词汇训练首页 UI | `home.html` (vocab tab) | 2 |
| 6 | **词汇闪电战**（1 个核心模式） | `flash-war.js` + 训练 UI | 4 |
| 7 | 10 分钟硬上限计时器 | `components/timer.js` | 1 |
| 8 | 鼓励式反馈组件 | `components/feedback.js` | 1.5 |
| 9 | 错题列表（待复习/已掌握） | 嵌入 `home.html` | 1.5 |
| 10 | 错题复盘墙（简化版） | `review.html` | 2 |
| 11 | 爸爸模式：密码保护 | `dad-mode-guard.js` | 1 |
| 12 | 爸爸模式：本周默写清单导出 | `offline-test-export.js` | 1.5 |
| 13 | 爸爸模式：线下成绩录入 | 嵌入 `dad-mode.html` | 1.5 |
| 14 | 间隔重复算法（v0.1 简化版） | `spaced-repetition.js` | 1 |
| 15 | 错误边界处理（无错题时、空状态） | 全局 | 1 |
| 16 | 部署 + 测试 + 修复 | - | 3 |
| **合计** | | | **~29 人时**（约 4 个工作日） |

### 9.2 v0.1 延后做

- ❌ 拼写特训营（模式 1）→ v0.2
- ❌ 混淆词大作战（模式 3）→ v0.2
- ❌ 从零学词（模式 4）→ v0.2
- ❌ 训练进度自适应 → v0.2
- ❌ TTS 听写 → v0.3
- ❌ 词族聚合 → v0.3

### 9.3 v0.1 不做

- ❌ 任何 LLM API
- ❌ 任何后端服务
- ❌ 拍照 OCR
- ❌ 邮件/微信推送
- ❌ 多用户支持

### 9.4 v0.1 验证条件（"完成"定义）

- [ ] 你（爸爸）能通过粘贴 Excel 导入 231 道错题
- [ ] 错因自动识别准确率 ≥ 70%（抽样 50 道验证）
- [ ] 诗颖能完成 1 次"词汇闪电战"训练
- [ ] 训练到 10 分钟自动弹窗，不可绕过
- [ ] 错答时不显示"哪里错"
- [ ] 错题复盘墙能展示"已掌握 N 个"
- [ ] 爸爸模式密码保护生效
- [ ] 本周默写清单能正确导出 TSV
- [ ] 线下成绩能正确录入并更新错题状态

---

## 10. 风险与预案

### 10.1 数据丢失风险

| 场景 | 影响 | 预案 |
|------|------|------|
| 浏览器清缓存 | localStorage 全部丢失 | 爸爸模式加"导出全部数据"功能，每次导入后建议导出 |
| 多设备 | 数据不同步 | v0.1 不做同步；v0.3 可加 JSON 导入/导出 |
| 容量超限 | 写入失败 | 估算 860KB ≪ 5MB，v0.1 不会超 |
| localStorage 损坏 | 部分数据损坏 | 加 try-catch，损坏时自动备份到备份 key |

### 10.2 隐私与合规

| 维度 | 措施 |
|------|------|
| 数据所有权 | 数据**只在用户浏览器**，不传任何服务器 |
| 个人信息 | 诗颖的学习数据 + 你的爸爸模式密码（哈希） |
| 第三方 | 无任何第三方 API（v0.1） |
| 未来扩展 | 如果上 LLM API，**用 PII 过滤**，不上传姓名/学校等敏感信息 |

### 10.3 工程风险

| 风险 | 概率 | 缓解 |
|------|------|------|
| 微信浏览器兼容 | 中 | 复用现有"事件委托"模式（已验证） |
| TSV 解析兼容不同 Excel | 中 | 测试 LibreOffice/Numbers/WPS/Excel；提供"调试模式"展示原始粘贴内容 |
| 错因识别准确率低 | 中 | 抽样验证 + 让爸爸确认/修正 |
| 诗颖 10 分钟内完不成 | 中 | v0.1 训练题目数设为 5-10 题（不是 15-20） |
| 移动端体验差 | 低 | 主要在手机端使用，UI 优先适配移动端 |
| 离线默写导出格式不友好 | 中 | 提供"复制到剪贴板"和"下载文件"两种方式 |

---

## 11. 测试策略

### 11.1 单元测试（v0.1 必须有）

```javascript
// test/error-classifier.test.js

const testCases = [
  {
    input: { wrongAnswer: '', errorNote: '' },
    expected: { category: 'unlearned', confidence: 0.95 }
  },
  {
    input: { wrongAnswer: 'wesneday', errorNote: '漏字母 d' },
    expected: { category: 'spelling', subType: 'spelling_missing' }
  },
  // ... 至少 30 个测试用例
];
```

**测试覆盖**：
- 错因识别：14 个分类每个至少 1 个测试用例
- 间隔重复：5 个 masteryLevel 区间
- TSV 解析：5 种格式（带/不带表头、有空行、字段缺失等）
- 数据去重：同 word 多批次导入

### 11.2 端到端测试（手动）

| 场景 | 测试步骤 |
|------|---------|
| 爸爸导入 231 道错题 | 粘贴 Excel → 解析 → 分类 → 写入 → 展示统计 |
| 诗颖完成 1 次训练 | 打开 → 选模式 → 作答 → 反馈 → 完成 |
| 训练到 10 分钟 | 启动 → 等待 → 弹窗 → 不能跳过 |
| 错答不显示"哪里错" | 故意写错 → 验证不显示高亮 |
| 错题列表 | 切换"待复习/已掌握" → 状态变化 |
| 复盘墙 | 周一打开 → 看上周数据 |
| 导出默写清单 | 爸爸模式 → 导出 → 复制到 Excel |
| 录入线下成绩 | 爸爸模式 → 标记对错 → 更新错题 |

### 11.3 UAT（用户验收测试）

**第 1 周（你 + 诗颖）**：
- 你负责：导入 231 道错题
- 诗颖负责：每天完成 1 次"词汇闪电战"（5-10 分钟）
- 每天记录：训练时长、诗颖主动评价（"好玩吗"）

**第 2 周**：
- 周末做 1 次线下默写（10-20 词）
- 录入成绩到系统
- 对比"线上说会 vs 线下写对"的一致性

---

## 12. 部署计划

### 12.1 文件结构（最终）

```
lumos/english/
├── index.html                          # Unit 7 情景对话（现有，不动）
├── state-manager.js                    # 现有，不动
├── data/
│   └── knowledge-english.json          # 现有，不动
│
├── vocab/                              # 🆕 词汇错题模块
│   ├── index.html                      # 词汇训练首页（同时是入口）
│   ├── style.css
│   ├── app.js                          # 主入口（路由）
│   │
│   ├── pages/
│   │   ├── home.html
│   │   ├── training.html
│   │   ├── review.html
│   │   ├── import.html
│   │   ├── export.html
│   │   └── dad-mode.html
│   │
│   ├── components/
│   │   ├── word-card.js
│   │   ├── feedback.js
│   │   ├── timer.js
│   │   └── mode-selector.js
│   │
│   ├── training-modes/
│   │   ├── base.js
│   │   ├── flash-war.js                # v0.1 唯一实现的
│   │   ├── spelling-camp.js            # v0.2
│   │   ├── confusion-battle.js         # v0.2
│   │   ├── from-zero.js                # v0.2
│   │   └── review-wall.js              # v0.1（不是训练，是周报）
│   │
│   ├── stores/
│   │   ├── vocab-error-store.js
│   │   ├── batch-store.js
│   │   ├── training-record-store.js
│   │   └── offline-store.js
│   │
│   ├── utils/
│   │   ├── error-classifier.js
│   │   ├── spaced-repetition.js
│   │   ├── tsv-parser.js
│   │   ├── part-of-speech-parser.js
│   │   └── dad-mode-guard.js
│   │
│   └── test/
│       ├── error-classifier.test.js
│       ├── tsv-parser.test.js
│       └── spaced-repetition.test.js
│
└── README.md                           # 更新说明
```

### 12.2 部署步骤

1. 工程师本地开发 + 单元测试
2. 部署到 GitHub Pages 预览（push 到 feature 分支）
3. 你（爸爸）做 UAT 试导入 + 试训练
4. 修复 bug
5. 合并到 main 分支
6. 诗颖上线

### 12.3 回滚计划

如果 v0.1 出现严重问题：
- Git revert 到上一个稳定版本
- 词汇模块**完全独立**，不影响现有 Unit 7 情景对话
- 诗颖可以继续用原版 Lumos

---

## 13. 评审问题清单

请 workHy 和 codeG 在评审时回答：

### 13.1 给 workHy（工程实现）

| # | 问题 |
|---|------|
| Q1 | 上述 16 个功能项的工时估算合理吗？有没有低估/高估的？ |
| Q2 | 数据模型字段（VocabErrorRecord 等）有需要调整的吗？ |
| Q3 | 5 个训练模式的技术实现思路 OK 吗？有没有更好的方案？ |
| Q4 | 间隔重复算法 v0.1 简化版是否够用？还是需要更复杂的（如 SuperMemo SM-2）？ |
| Q5 | "无限时模式" vs "闪电挑战模式"——实现上增加多少复杂度？ |
| Q6 | 词性自动解析的规则覆盖度够吗？需要更多边界 case 吗？ |
| Q7 | 微信浏览器兼容（事件委托）经验复用 OK 吗？ |
| Q8 | 离线默写清单导出的格式，你建议用 TSV 还是直接生成 .xlsx？ |
| Q9 | 爸爸模式密码用简单哈希（btoa）够吗？还是上 Web Crypto API？ |
| Q10 | 错误边界（无错题时、空状态）有遗漏吗？ |

### 13.2 给 codeG（质量门禁）

| # | 问题 |
|---|------|
| Q1 | 隐私合规：数据全部存 localStorage，**完全不上传任何服务器**——这个设计合规吗？ |
| Q2 | 数据丢失风险：浏览器清缓存数据全丢——这个风险等级你能接受吗？ |
| Q3 | 密码用简单哈希：v0.1 是不是 OK？还是 v0.1 就要上更安全的方式？ |
| Q4 | 错因自动识别的"置信度 < 0.7 让人工确认"——这个 fallback 设计合理吗？ |
| Q5 | "诗颖主动说不想用" 的应对路径（9.2 节）——足够尊重用户吗？ |
| Q6 | 5 个训练模式推荐的优先级逻辑（generateTodayQueue）——会不会形成"信息茧房"？ |
| Q7 | 容量估算（860KB / 5MB）——安全吗？还是需要更早的迁移方案？ |
| Q8 | 整体架构的"渐进式升级"设计——遇到未来需求变化时灵活吗？ |

---

## 14. 评审通过后的下一步

如果工程团队同意这个方案：

1. **skyone（你）**：
   - 把 231 道错题整理成 TSV 格式
   - 写一份"批量导入使用手册"给未来的自己

2. **workHy**：
   - 按 16 个功能项排期（建议 1 周内完成 v0.1）
   - 完成后部署到 GitHub Pages
   - 提交单元测试和 E2E 测试

3. **codeG**：
   - 跑一遍测试
   - 提 bug 报告
   - 写一份"质量门禁检查清单"

4. **诗颖**：
   - 试着用 1 周，反馈"好玩吗？"
   - 周末线下默写，对比系统数据

5. **第 2 周回顾**：
   - 收集诗颖的真实反馈
   - 决定是否上 v0.2（拼写特训营、混淆词大作战等）

---

*本工程方案评审文档完成于 2026-07-11，请 workHy 和 codeG 在 2026-07-12 之前提交反馈。*

*PRD v2.1 + 工程方案评审 v1.0 = Lumos 词汇错题智能训练系统的"产品规格 + 工程蓝图"完整版。*
