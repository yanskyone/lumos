# Lumos 学习系统

> 为初二升初三学生打造的个性化学习陪伴系统  
> **当前版本**: v0.7.0 | **状态**: 🔧 开发中 — P0 修复完成，待真实用户验证

---

## 📖 快速导航

### 🚀 产品入口
| 模块 | 访问地址 | 说明 |
|------|----------|------|
| **统一入口** | [https://yanskyone.github.io/lumos/](https://yanskyone.github.io/lumos/) | 选择数学/英语模块 |
| **数学模块** | [https://yanskyone.github.io/lumos/math/](https://yanskyone.github.io/lumos/math/) | 99个知识点，练习+错题管理 |
| **英语模块** | [https://yanskyone.github.io/lumos/english/](https://yanskyone.github.io/lumos/english/) | 情景交际，背诵+练习模式 |

### 📚 新成员必读
1. **[过程文档](learning-map/process.md)** — 项目全貌、技术架构、下一步计划
2. **[团队章程](learning-map/TEAM_CHARTER.md)** — 角色定义、协作规范
3. **本文档** — 5分钟了解项目整体

---

## 🎯 项目定位

Lumos 不是一个"知识库"，而是一个**陪伴学习过程的系统**。

```
学习 → 练习 → 反馈 → 记录 → 回顾 → 再学习
```

**核心理念**（来自 Gpt 的建议）：
> 优先支持"今天要学的"，而不是"最终都会学的"。

---

## 📁 项目结构

```
lumos/                          # 部署目录（GitHub Pages 根）
├── index.html                  # 统一入口
├── math/                      # 数学模块
│   ├── index.html
│   ├── app.js
│   ├── state-manager.js       # 状态管理（localStorage）
│   ├── style.css
│   └── data/knowledge.json    # 99个知识点
├── english/                   # 英语模块
│   ├── index.html
│   ├── state-manager.js       # 状态管理（独立命名空间）
│   └── data/knowledge-english.json  # 5个场景（Unit 7）
└── README.md                  # 本文件

learning-map/                  # 工程文档（不直接部署）
├── process.md                 # 项目进展报告（核心文档）
├── TEAM_CHARTER.md            # 团队章程
├── WIKI-SCHEMA.md             # 知识库规范
├── docs/                      # 设计文档、对话记录
│   ├── progress-sync-*.md     # 每日进展同步
│   ├── conversation-history/  # 专家对话记录
│   ├── ADR/                   # 架构决策记录
│   └── scenario-analysis-*.md # 场景深度分析
├── wiki/                      # LLM 维护的知识库（99个知识点）
├── raw/                       # 原始参考数据
└── scripts/                   # 构建工具
```

---

## 🧑‍🤝‍🧑 团队成员

| 角色 | 名称 | 职责 |
|------|------|------|
| **产品负责人** | skyone | 需求定义、用户反馈、产品决策 |
| **开发代理** | workHy | 代码实现、文档整理、bug修复 |
| **质量门禁** | codeG | 代码审查、风险评估、架构建议 |
| **产品顾问** | Gpt | 产品方向、用户场景、功能优先级 |

---

## 📋 文档地图

### 核心文档（必读）
- [过程文档](learning-map/process.md) — 项目状态、技术架构、下一步计划
- [团队章程](learning-map/TEAM_CHARTER.md) — 角色、规范、协作方式

### 进展同步
- [2026-07-02 进展同步](learning-map/docs/progress-sync-2026-07-02.md) — 今日工作（P0修复、部署、文档整理）
- [2026-07-01 进展同步](learning-map/docs/progress-sync-2026-07-01.md) — 昨日工作

### 对话记录
- [Phase 1 英语方向 pivot](learning-map/docs/conversation-history/phase1-english-pivot.md) — 英语模块决策全过程
- [Phase 0 验收记录](learning-map/docs/conversation-history/phase0-acceptance.md) — 数学模块完成记录
- [PEM 框架建立](learning-map/docs/conversation-history/pem-framework-establishment.md) — 早期方法论

### 技术分析
- [场景深度还原分析（英语）](learning-map/docs/scenario-analysis-english.md) — 产品价值分析
- [Learning Analytics 设计](learning-map/docs/LearningAnalytics.md) — 学习数据分析规划

### 问题追踪
- [Phase 0 修复追踪](learning-map/docs/fix-tracking-phase0.md) — 数学模块问题修复记录

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML + CSS + JS（无框架） | 纯静态，GitHub Pages 直接托管 |
| 公式渲染 | KaTeX 0.16.21 | 数学公式 |
| 数据持久化 | localStorage | 通过 `StateManager` 访问 |
| 部署 | GitHub Pages | main 分支自动构建 |
| 版本管理 | Git + GitHub | SSH 推送 |

---

## 🚦 当前状态（v0.7.0）

| 模块 | 状态 | 说明 |
|------|------|------|
| 数学模块 | ✅ MVP 完成 | 99知识点，练习功能，LaTeX渲染 |
| 英语模块 | ✅ MVP 完成 | 5场景（Unit 7），背诵+练习模式 |
| GitHub Pages | ✅ 已部署 | 线上可访问 |
| 真实用户验证 | ⏳ 待开始 | 让女儿试用，收集反馈 |

---

## 🎯 下一步计划

### P0（当前）
- [x] 修复数学模块按钮失效（DOMContentLoaded race condition）
- [x] 修复英语模块 bug（state-manager.js 缺失、代码残留）
- [ ] 让真实用户（女儿）试用

### P1（重要）
- [ ] 收集用户反馈
- [ ] 根据反馈决定：扩充英语内容 vs 修复数学残留问题

### P2（可选）
- [ ] 英语模块：最简错题本
- [ ] 两个模块：Spaced Repetition（至少收集2周数据后再做）

---

## 📝 开发规范

### 添加新功能
1. 先在 `learning-map/docs/progress-sync-YYYY-MM-DD.md` 记录计划
2. 实现功能
3. 更新 `learning-map/process.md` 版本号
4. 提交时写清楚的 commit message

### 修复 bug
1. 在 `learning-map/docs/fix-tracking-phase0.md` 记录问题
2. 修复后在进展同步文档中更新状态

### 文档更新
- 所有文档在 `learning-map/docs/` 下
- 对话记录放在 `learning-map/docs/conversation-history/`
- 进展同步命名为 `progress-sync-YYYY-MM-DD.md`

---

## 📧 联系

- **仓库**: https://github.com/yanskyone/lumos
- **Issues**: https://github.com/yanskyone/lumos/issues
- **产品负责人**: skyone

---

**最后更新**: 2026-07-02 | **更新人**: workHy
