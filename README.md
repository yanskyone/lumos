# Lumos 学习系统

> 为初二升初三学生打造的个性化学习陪伴系统  
> **当前版本**: v3.2 | **状态**: 🔧 开发中 — vocab 重构完成，混淆词持久化已验证

---

## 📖 快速导航

### 🚀 产品入口
| 模块 | 访问地址 | 说明 |
|------|----------|------|
| **统一入口** | [https://yanskyone.github.io/lumos/](https://yanskyone.github.io/lumos/) | 选择数学/英语模块 |
| **数学模块** | [https://yanskyone.github.io/lumos/math/](https://yanskyone.github.io/lumos/math/) | 99个知识点，练习+错题管理 |
| **词汇训练** | [https://yanskyone.github.io/lumos/vocab/](https://yanskyone.github.io/lumos/vocab/) | 混淆词大作战（选择题），离线优先 |

---

## 🎯 项目定位

Lumos 不是一个"知识库"，而是一个**陪伴学习过程的系统**。

```
学习 → 练习 → 反馈 → 记录 → 回顾 → 再学习
```

**核心理念**：
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
├── vocab/                     # 词汇训练模块 (v3.2)
│   ├── index.html             # 页面结构
│   ├── style.css             # 样式表
│   ├── app.js               # 应用逻辑
│   ├── state-manager.js      # 状态管理
│   ├── cloud-storage.js      # Supabase 云端存储
│   └── data/errors.json      # 本地默认数据
├── english/                  # 英语模块
│   └── ...
└── README.md

docs/                          # 工程文档
├── CHANGELOG.md               # 开发日志
├── PRD-英语错题管理与AI练习系统.md  # 产品需求文档 (v3.1)
├── DB-DOC-数据库说明.md        # 数据库说明文档 (v1.1)
├── ARCH-架构优化建议.md        # 架构优化建议
└── ADR/                       # 架构决策记录
    └── ADR-001-训练模式聚焦选择题.md
```

---

## 🚦 当前状态（v3.2）

| 模块 | 状态 | 说明 |
|------|------|------|
| **词汇训练 (vocab)** | ✅ 核心功能完成 | 混淆词大作战、词汇闪电战、离线优先 |
| **数学模块** | ✅ MVP 完成 | 99知识点，练习功能 |
| **英语模块** | ✅ MVP 完成 | 5场景（Unit 7） |
| **GitHub Pages** | ✅ 已部署 | 线上可访问 |
| **混淆词持久化** | ✅ 已验证 | 选择正确答案后不再出现 |
| **真实用户验证** | ⏳ 待开始 | 让诗颖试用，收集反馈 |

---

## 🔄 vocab 模块特性 (v3.2)

### 训练模式
| 模式 | 类型 | 状态 | 说明 |
|------|------|------|------|
| **混淆词大作战** | 选择题 | ✅ 核心功能 | 选择正确答案，持久化存储 |
| **词汇闪电战** | 输入题 | ⏸️ 暂留 | 后续考虑改成选择题 |

### 技术特性
| 特性 | 说明 |
|------|------|
| **离线优先** | 断网时自动使用本地 JSON 数据 |
| **云端同步** | Supabase 数据库，支持公共+私有错题 |
| **多文件架构** | app.js / state-manager.js / cloud-storage.js 分离 |

---

## 📋 文档地图

### 核心文档
- [开发日志](docs/CHANGELOG.md) — 今日工作总结
- [产品需求文档](PRD-英语错题管理与AI练习系统.md) — v3.1 版本
- [数据库说明](DB-DOC-数据库说明.md) — Supabase 表结构、访问地址

### 架构决策
- [ADR-001](docs/ADR/ADR-001-训练模式聚焦选择题.md) — 训练模式聚焦选择题形式

### 架构优化
- [架构优化建议](ARCH-架构优化建议.md) — 优化任务清单、工作量估算

---

## 🔜 下一步计划

### P0（立即）
- [ ] 让诗颖试用混淆词大作战，收集反馈
- [ ] 验证用户真实使用体验

### P1（下一迭代）
- [ ] 增加更多混淆词对（当前32对，目标50-100对）
- [ ] 词汇闪电战选择题化改造

### P2（未来）
- [ ] 成就徽章系统
- [ ] 多设备云端同步

---

## 🔧 本地调试

### 离线模式
由于支持**离线优先**，本地调试不需要网络：
```bash
# 方式1: 直接打开文件
file:///path/to/lumos/vocab/index.html

# 方式2: 本地服务器
cd lumos
python3 -m http.server 8080
# 访问 http://localhost:8080/vocab/
```

### Supabase 管理后台
```
https://supabase.com/dashboard/project/dmxytyvleoodvaggvkdg
```

---

## 📧 联系

- **仓库**: https://github.com/yanskyone/lumos
- **Issues**: https://github.com/yanskyone/lumos/issues
- **产品负责人**: skyone

---

**最后更新**: 2026-07-17 | **版本**: v3.2
