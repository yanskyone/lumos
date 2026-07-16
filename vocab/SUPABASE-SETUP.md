# Lumos Vocab - Supabase 配置指南

## 步骤 1：创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 "Start your project"
3. 用 GitHub 账号登录
4. 点击 "New project"
5. 填写信息：
   - Name: `lumos-vocab`
   - Database Password: 生成一个强密码（记住它）
   - Region: 选择最近的区域（如 ` Northeast Asia (Tokyo)`）
6. 点击 "Create new project"
7. **等待 2 分钟**让项目创建完成

## 步骤 2：获取 API 密钥

1. 进入项目后，点击左侧 **Settings**（齿轮图标）
2. 点击 **API**
3. 找到以下信息：

```
Project URL: https://xxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

复制这两个值。

## 步骤 3：创建数据库表

1. 在 Supabase 左侧点击 **SQL Editor**
2. 点击 **New query**
3. 粘贴 `supabase-schema.sql` 文件的内容
4. 点击 **Run**

应该看到 "Success" 消息。

## 步骤 4：配置前端

1. 打开 `supabase-client.js`
2. 替换以下内容：

```javascript
const CONFIG = {
  SUPABASE_URL: '这里粘贴 Project URL',
  SUPABASE_ANON_KEY: '这里粘贴 anon public key'
};
```

## 步骤 5：上传错题数据

在 Supabase SQL Editor 中运行以下脚本导入 667 条错题：

```sql
-- 清空现有数据
DELETE FROM vocab_errors;

-- 插入数据（需要用 Python 脚本生成 SQL）
```

或者用以下方法：

1. 在 Supabase 左侧点击 **Table Editor**
2. 点击 **vocab_errors** 表
3. 点击 **Import data from CSV**
4. 选择 `data/errors.json` 转换成的 CSV 文件

## 步骤 6：生成 CSV 格式

```bash
python3 << 'EOF'
import json
import csv

with open('data/errors.json', 'r') as f:
    data = json.load(f)

# 输出 CSV
print('id,word,phonetic,meaning,category,wrong_answer,error_note,tip,unit,status,masters_modes,confused_with,correct_count,created_at,last_practiced_at,batch_id')

for e in data['errors']:
    print(f"{e.get('id','')},{e.get('word','')},{e.get('phonetic','')},{e.get('meaning','')},{e.get('category','unlearned')},{e.get('wrongAnswer','')},{e.get('errorNote','')},{e.get('tip','')},{e.get('unit','')},{e.get('status','pending')},{','.join(e.get('masteredModes',[]))},{','.join(e.get('confusedWith',[]))},{e.get('correctCount',0)},{e.get('createdAt','')},{e.get('lastPracticedAt','')},{e.get('batchId','')}")
EOF
```

## 步骤 7：更新 index.html

在 `index.html` 中添加 Supabase 客户端引用：

```html
<script src="supabase-client.js"></script>
```

## 测试连接

在浏览器控制台输入：

```javascript
LumosSupabase.ping().then(ok => console.log('连接:', ok ? '成功' : '失败'))
LumosSupabase.getErrors().then(r => console.log('错题数:', r.data?.length))
```

## 常见问题

### Q: 报 CORS 错误
确保在 Supabase Settings -> API 中启用了正确的 origin，或添加你的域名。

### Q: 数据不显示
检查 RLS 策略是否正确创建，或暂时禁用 RLS 测试。

### Q: 如何重置数据
在 SQL Editor 运行：
```sql
TRUNCATE vocab_errors, vocab_training, vocab_batches CASCADE;
```
