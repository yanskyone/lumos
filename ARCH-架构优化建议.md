# Lumos Vocab - 架构优化建议

> **日期**: 2026-07-17  
> **基于**: v3.1 产品方向调整  
> **状态**: 建议稿，待评审

---

## 📋 背景

基于真实用户（诗颖）的使用反馈：

> "孩子做题目时更喜欢做选择题，不太喜欢大量输入"

**决策**：
- ✅ 保留：混淆词大作战（选择题）
- ⏸️ 暂留：词汇闪电战（后续优化为选择题）
- ❌ 移除：拼写特训营（输入形式，兴趣低）

---

## 🎯 优化目标

1. **简化代码**：移除不需要的拼写特训营代码
2. **提升体验**：统一选择题形式的训练
3. **增强内容**：丰富混淆词对库
4. **可维护性**：模块化代码结构

---

## 📝 待执行任务清单

### 1. 移除拼写特训营（立即）

**修改文件**：
- `app.js` - 移除 `spelling` 模式相关代码
- `state-manager.js` - 移除 `getSpellingErrors()`, `getSpellingLevels()` 等方法
- `index.html` - 移除拼写特训营入口

**预期减少代码量**：~150行

**操作**：
```javascript
// app.js 中移除：
// - startTraining() 中的 spelling 分支
// - checkLevelComplete() 及相关函数
// - levelWords, levelCorrect, levelTotal, levelIndex 状态

// state-manager.js 中移除：
// - getSpellingErrors()
// - getSpellingLevels()
// - checkLevelPass()
```

---

### 2. 验证混淆词持久化（立即）

**待验证**：选择正确答案后，词对是否持久化存储，下次不再出现

**验证步骤**：
1. 打开 `vocab/index.html`
2. 进入混淆词大作战
3. 选择正确答案
4. 刷新页面，重新进入
5. 检查词对是否不再出现

---

### 3. 增加更多混淆词对（下一步）

**当前**：32 对预设词对

**扩展来源**：
1. 从用户错题中自动识别（`getConfusionPairsFromErrors()` 已有此功能）
2. 从公共错题库（667条）中提取
3. 手动添加高频易混词

**目标**：扩展到 50-100 对

---

### 4. 词汇闪电战选择题化（后续）

**当前形式**：
```
中文: 星期三
输入: [ ________ ]
```

**优化形式**：
```
中文: 星期三
[ A. wensday ]  [ B. Wednesday ]
```

**实现方案**：
```javascript
function startFlashWarAsChoice() {
  // 获取一个正确词
  const correctWord = getRandomPendingWord();
  
  // 从已掌握的词中随机选一个作为干扰项
  const wrongWord = getRandomMasteredWord();
  
  // 随机排列选项
  const options = shuffle([correctWord, wrongWord]);
  
  // 显示选择题 UI
  showChoiceQuestion({
    meaning: correctWord.meaning,
    options: options,
    correctAnswer: correctWord.word
  });
}
```

---

### 5. 模块化重构（长期）

**目标**：将 app.js 拆分为更小的模块

**拆分方案**：
```
vocab/
├── app.js                    # 主入口，协调各模块
├── components/
│   ├── confusion-trainer.js  # 混淆词训练逻辑 (~200行)
│   ├── flash-war-trainer.js  # 词汇闪电战逻辑 (~150行)
│   └── feedback.js           # 反馈语料库 (~50行)
├── modules/
│   ├── confusions.js         # 混淆词对数据 (~150行)
│   └── errors.js             # 错题数据操作 (~200行)
└── utils/
    └── storage.js            # localStorage 封装 (~100行)
```

**好处**：
- 单一职责，每个文件专注一个功能
- 易于测试
- 易于协作
- 减少代码冲突

---

## 📊 工作量估算

| 任务 | 优先级 | 复杂度 | 预计时间 |
|------|--------|--------|---------|
| 移除拼写特训营 | P0 | 低 | 30分钟 |
| 验证混淆词持久化 | P0 | 低 | 10分钟 |
| 增加混淆词对 | P1 | 中 | 1-2小时 |
| 词汇闪电战选择题化 | P1 | 中 | 2-3小时 |
| 模块化重构 | P2 | 高 | 4-6小时 |

---

## ✅ 决策点

在开始执行之前，请确认：

1. **移除拼写特训营**：是否立即执行？
2. **混淆词扩展**：是否需要从公共错题库自动提取？
3. **词汇闪电战**：是否改为选择题形式？

---

*文档创建于 2026-07-17*
