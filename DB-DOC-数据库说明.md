# Lumos Vocab - 数据库说明文档

> **版本**: v1.0  
> **日期**: 2026-07-17  
> **数据库**: Supabase (PostgreSQL)  
> **状态**: 已上线

---

## 📋 概览

Lumos Vocab 使用 **Supabase**（基于 PostgreSQL）作为云端数据库，支持：
- 公共错题库（所有用户共享）
- 私有错题（用户个人数据）
- 混合模式（同时使用公共 + 私有错题）

---

## 🗄️ 数据库连接信息

```javascript
// cloud-storage.js 配置
const CONFIG = {
  SUPABASE_URL: 'https://dmxytyvleoodvaggvkdg.supabase.co',
  SUPABASE_KEY: 'sb_publishable_KIUoi4AebdtwJDMrPeq01w_i_m7MGNz'
};
```

---

## 📊 数据表结构

### 表 1: vocab_errors（错题表）

**用途**: 存储所有错题数据（公共 + 私有）

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `id` | VARCHAR(50) | 主键，唯一标识 | `ve-001` |
| `word` | VARCHAR(100) | 英文单词 | `Wednesday` |
| `phonetic` | VARCHAR(100) | 音标 | `ˈwenzdeɪ` |
| `meaning` | TEXT | 中文释义 | `星期三` |
| `category` | VARCHAR(20) | 错因分类 | `unlearned` / `spelling` |
| `wrong_answer` | VARCHAR(100) | 错误版本 | `wesneday` |
| `error_note` | TEXT | 错误分析 | `漏字母 d` |
| `tip` | TEXT | 记忆提示 | `Wed-nes-day` |
| `unit` | VARCHAR(50) | 来源单元 | `Unit 2` |
| `status` | VARCHAR(20) | 掌握状态 | `pending` / `practicing` / `mastered` |
| `mastered_modes` | TEXT[] | 通过的训练模式 | `{flash_war,confusion}` |
| `confused_with` | TEXT[] | 混淆词列表 | `{sell,sale}` |
| `correct_count` | INTEGER | 正确次数 | `3` |
| `share_type` | VARCHAR(20) | 分享类型 | `public` / `private` |
| `owner_id` | VARCHAR(50) | 所有者ID | `system` / `u123abc...` |
| `batch_id` | VARCHAR(50) | 批次ID | `batch-initial` |
| `created_at` | TIMESTAMP | 创建时间 | `2026-07-17T10:00:00Z` |
| `last_practiced_at` | TIMESTAMP | 最后练习时间 | `2026-07-17T15:30:00Z` |

**索引**:
- `idx_word` on `word`
- `idx_status` on `status`
- `idx_owner_id` on `owner_id`
- `idx_share_type` on `share_type`

---

### 表 2: vocab_public（公共错题库）

**用途**: 存储预设的公共错题，供所有用户使用

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | SERIAL | 主键，自增 |
| `word` | VARCHAR(100) | 英文单词 |
| `phonetic` | VARCHAR(100) | 音标 |
| `meaning` | TEXT | 中文释义 |
| `category` | VARCHAR(20) | 错因分类 |
| `wrong_answer` | VARCHAR(100) | 错误版本 |
| `error_note` | TEXT | 错误分析 |
| `tip` | TEXT | 记忆提示 |
| `unit` | VARCHAR(50) | 来源单元 |
| `created_at` | TIMESTAMP | 创建时间 |

**说明**: 
- 当前包含 **667 条**公共错题
- 初始化脚本: `supabase-init.sql`

---

### 表 3: vocab_training（训练记录表）

**用途**: 存储用户的训练历史记录

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `id` | SERIAL | 主键，自增 | `1` |
| `error_id` | VARCHAR(50) | 错题ID | `ve-001` |
| `user_id` | VARCHAR(50) | 用户ID | `u123abc...` |
| `mode` | VARCHAR(20) | 训练模式 | `flash_war` / `spelling` / `confusion` |
| `is_correct` | BOOLEAN | 是否正确 | `true` / `false` |
| `response_time` | INTEGER | 响应时间（毫秒） | `2500` |
| `created_at` | TIMESTAMP | 创建时间 | `2026-07-17T15:00:00Z` |

**索引**:
- `idx_training_user_id` on `user_id`
- `idx_training_mode` on `mode`
- `idx_training_created` on `created_at`

---

### 表 4: vocab_batches（批次表）

**用途**: 存储导入批次信息

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `id` | VARCHAR(50) | 主键 | `batch-2026-07-17` |
| `source` | VARCHAR(50) | 数据来源 | `offline_dictation` |
| `total_imported` | INTEGER | 导入数量 | `50` |
| `created_at` | TIMESTAMP | 创建时间 | `2026-07-17T10:00:00Z` |

---

## 💾 localStorage 数据结构

### 键值映射

| Key | 类型 | 说明 |
|-----|------|------|
| `lumos:vocab:errors` | JSON Array | 用户私有错题 |
| `lumos:vocab:training` | JSON Array | 本地训练记录 |
| `lumos:vocab:batches` | JSON Array | 批次信息 |
| `lumos:vocab:confusion-mastered` | JSON Array | 已掌握的混淆词对 |
| `lumos:vocab:user-id` | String | 用户匿名ID |
| `lumos:vocab:last-export` | String | 最后导出时间戳 |

---

## 🔐 权限策略（RLS）

### vocab_errors 表

| 策略 | 条件 | 说明 |
|------|------|------|
| `public_read` | `share_type = 'public'` | 公共错题可读 |
| `private_read` | `owner_id = auth.uid()` | 私有错题仅所有者可读 |
| `public_insert` | `share_type = 'public'` | 允许创建公共错题 |
| `private_insert` | `owner_id = auth.uid()` | 允许创建私有错题 |

### vocab_public 表

| 策略 | 说明 |
|------|------|
| `public_read` | 所有用户可读（只读） |

---

## 🔄 数据同步逻辑

### 启动流程

```
1. 检查网络状态
   ├─ 在线 → 从 Supabase 加载
   │   ├─ 获取用户私有错题
   │   └─ 获取公共错题库
   └─ 离线 → 从 localStorage 加载

2. 数据合并
   ├─ 公共错题 + 私有错题 → 合并显示
   └─ 状态以私有为准（可覆盖公共）

3. 写入策略
   ├─ 公共错题 → 写入 Supabase
   └─ 私有错题 → 写入 localStorage + Supabase
```

### 冲突解决（预留）

```javascript
// TODO: Cloud #1 — 冲突解决
// setMastery / addWrongQuestion 需增加
// 时间戳或版本号校验点，冲突时暂停写入并提示用户。
```

---

## 📝 SQL 脚本说明

| 脚本 | 用途 |
|------|------|
| `supabase-schema.sql` | 创建表结构 |
| `supabase-init.sql` | 初始化公共错题库（50条） |
| `supabase-public-table.sql` | 创建 vocab_public 表 |
| `supabase-migrate.sql` | 数据迁移脚本 |
| `supabase-mixed-mode.sql` | 混合模式相关配置 |
| `supabase-add-user.sql` | 添加用户记录 |

---

## 🧪 测试查询

### 查看错题分布

```sql
-- 按状态统计
SELECT status, COUNT(*) as count 
FROM vocab_errors 
GROUP BY status;

-- 按分类统计
SELECT category, COUNT(*) as count 
FROM vocab_errors 
GROUP BY category;

-- 按分享类型统计
SELECT share_type, COUNT(*) as count 
FROM vocab_errors 
GROUP BY share_type;
```

### 查看训练记录

```sql
-- 今日训练统计
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
  ROUND(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as accuracy
FROM vocab_training
WHERE created_at >= CURRENT_DATE;
```

### 重置数据

```sql
-- 清空用户数据
TRUNCATE TABLE vocab_errors RESTART IDENTITY CASCADE;
TRUNCATE TABLE vocab_training RESTART IDENTITY CASCADE;
TRUNCATE TABLE vocab_batches RESTART IDENTITY CASCADE;

-- 或者只清空私有数据
DELETE FROM vocab_errors WHERE share_type = 'private';
```

---

## 🔧 维护指南

### 备份数据

```bash
# 导出 CSV
# 在 Supabase Dashboard -> Table Editor -> vocab_errors -> Download CSV
```

### 恢复数据

```bash
# 在 Supabase Dashboard -> Table Editor -> vocab_errors -> Import data from CSV
```

### 清理旧训练记录

```sql
-- 删除 30 天前的训练记录
DELETE FROM vocab_training 
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

*文档更新于 2026-07-17*
