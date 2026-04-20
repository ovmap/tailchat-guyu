# Tailchat 本地开发环境启动指南

本文档记录了 Tailchat 项目在本地开发环境启动过程中遇到的问题及解决方案。

## 环境要求

- Node.js v18+（推荐 v18，v22 需要额外配置）
- pnpm 10+
- MongoDB
- Redis
- MinIO（对象存储）

## 快速启动

### 1. 克隆项目

```bash
git clone https://github.com/msgbyte/tailchat.git
cd tailchat
```

### 2. 修复依赖配置

项目存在 workspace 依赖配置问题，需要手动修复：

```bash
# 修复 client/web 的 tailchat-shared 依赖
sed -i 's/"tailchat-shared": "^1.0.0"/"tailchat-shared": "workspace:*"/g' client/web/package.json

# 批量修复 plugins 的 tailchat-server-sdk 依赖
find server/plugins -name "package.json" -exec sed -i 's/"tailchat-server-sdk": "\*"/"tailchat-server-sdk": "workspace:*"/g' {} \;
```

### 3. 安装依赖

```bash
pnpm install
```

如果遇到 esbuild 安装问题，手动执行：

```bash
cd node_modules/.pnpm/esbuild@0.15.18/node_modules/esbuild && node install.js
cd node_modules/.pnpm/esbuild@0.12.29/node_modules/esbuild && node install.js
```

### 4. 配置环境变量

创建 `server/.env` 文件：

```env
PORT=11000

# JWT 密钥（生产环境请修改为随机字符串）
SECRET=dev-secret-key-change-in-production

# MongoDB 连接
MONGO_URL=mongodb://user:pass@host:port/tailchat?authSource=admin

# Redis 连接
REDIS_URL=redis://:password@host:port/
TRANSPORTER=redis://:password@host:port/

# 服务端对外访问地址
API_URL=http://localhost:11000

# MinIO 对象存储配置
# 注意：MINIO_URL 不要带 http:// 协议前缀，格式为 host:port
MINIO_URL=host:port
MINIO_BUCKET_NAME=tailchat
MINIO_USER=tailchat
MINIO_PASS=com.msgbyte.tailchat

# Admin 后台密码
ADMIN_USER=tailchat
ADMIN_PASS=com.msgbyte.tailchat

# Node.js v22 兼容性配置
DISABLE_TRACING=true
```

### 5. 启动服务

```bash
cd server && pnpm dev:main
```

服务启动后访问：
- API: http://localhost:11000/api
- Health: http://localhost:11000/health

## 问题排查

### 问题 1：workspace 依赖找不到

**错误信息**：
```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND "tailchat-shared@workspace:^" is in the dependencies but no package named "tailchat-shared" is present in the workspace
```

**原因**：部分 package.json 中的 workspace 依赖使用了 `"*"` 或 `"^1.0.0"` 格式，pnpm 无法正确解析。

**解决方案**：将依赖版本改为 `"workspace:*"`，参见上方"修复依赖配置"步骤。

### 问题 2：Node.js v22 Tracing 兼容性

**错误信息**：
```
TypeError: Value of "this" must be of type Performance
```

**原因**：Node.js v22 的 performance API 有变化，moleculer 的 tracing 功能不兼容。

**解决方案**：添加环境变量 `DISABLE_TRACING=true`。

### 问题 3：MinIO listBuckets 兼容性

**错误信息**：
```
MinioInitializationError: Invalid bucket name : undefined
```

**原因**：minio 7.1.4 版本的 Promise 版本 `listBuckets()` 方法在某些配置下有 bug，会返回无效的错误。

**排查方法**：创建测试脚本验证：

```javascript
const Minio = require('minio');
const minioClient = new Minio.Client({
  endPoint: 'your-host',
  port: 9000,
  useSSL: false,
  accessKey: 'your-user',
  secretKey: 'your-pass',
});

// 测试 - 这个会失败
minioClient.listBuckets().catch(e => console.log('listBuckets 失败:', e.message));

// 测试 - 这个会成功
minioClient.bucketExists('tailchat').then(exists => console.log('bucketExists 成功:', exists));
```

**解决方案**：修改 SDK 源码，将 `ping()` 方法中的 `listBuckets()` 替换为 `bucketExists()`：

文件：`server/packages/sdk/src/services/mixins/minio.mixin.ts`

```typescript
// 修改前
ping({ timeout = 5000 } = {}) {
  return this.Promise.race([
    this.client.listBuckets().then(() => true),
    // ...
  ]);
}

// 修改后
ping({ timeout = 5000 } = {}) {
  const bucketName = this.settings.bucketName || 'tailchat';
  return this.Promise.race([
    this.client.bucketExists(bucketName).then(() => true),
    // ...
  ]);
}
```

修改后重新编译 SDK：

```bash
cd server/packages/sdk && pnpm build
```

### 问题 4：MINIO_BUCKET_NAME 未配置

**错误信息**：
```
Invalid bucket name : undefined
```

**原因**：环境变量 `MINIO_BUCKET_NAME` 未配置。

**解决方案**：在 `.env` 文件中添加：

```env
MINIO_BUCKET_NAME=tailchat
```

### 问题 5：端口被占用

**错误信息**：
```
EADDRINUSE: address already in use :::3000
```

**解决方案**：
- 检查占用端口的进程：`lsof -i :3000`
- 终止占用进程或修改配置使用其他端口

## 调试技巧

### 创建 MinIO 测试脚本

当遇到 MinIO 相关问题时，可以创建独立测试脚本快速定位：

```javascript
// test-minio.js
const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: '43.248.79.29',
  port: 16317,
  useSSL: false,
  accessKey: 'tailchat',
  secretKey: 'com.msgbyte.tailchat',
  pathStyle: true,
});

console.log('测试 bucketExists:');
minioClient.bucketExists('tailchat')
  .then(exists => console.log('成功, bucket存在:', exists))
  .catch(err => console.log('失败:', err.message));

console.log('测试 listBuckets:');
minioClient.listBuckets()
  .then(buckets => console.log('成功:', buckets))
  .catch(err => console.log('失败:', err.message));
```

运行：`node test-minio.js`

## 参考链接

- [Tailchat GitHub](https://github.com/msgbyte/tailchat)
- [Tailchat 官方文档](https://tailchat.msgbyte.com/)
- [MinIO Node.js SDK](https://min.io/docs/minio/linux/developers/nodejs/minio-nodejs.html)