# GuYu (谷雨) - AI 助手桥接插件

> 🌧️ 谷雨时节 · 古语传情

## 简介

GuYu 是一个连接 OpenClaw 与 Tailchat 的智能桥接插件，提供飞书协议兼容层，让 OpenClaw AI 助手可以无缝接入 Tailchat 平台。

## 功能特性

- ✅ **飞书 API 兼容** - 支持 `/open-apis/im/v1/messages` 等标准接口
- ✅ **WebSocket 推送** - 实时消息推送，支持心跳保活
- ✅ **消息格式转换** - OpenClaw ↔ Tailchat 消息格式自动转换
- ✅ **会话管理** - 自动创建和维护会话映射
- ✅ **消息循环防护** - 智能识别机器人消息，避免无限循环
- ✅ **古语风格** - 温柔、智慧、贴心的文案风格

## 技术架构

```
┌──────────────────┐
│   OpenClaw       │
│   (飞书协议)      │
└────────┬─────────┘
         │ HTTP + WebSocket
         ▼
┌────────────────────────────────┐
│  GuYu Plugin (谷雨)            │
│  - API 兼容层                   │
│  - WebSocket 管理               │
│  - 消息转换                     │
└────────┬───────────────────────┘
         │ Moleculer RPC
         ▼
┌────────────────────────────────┐
│  Tailchat Core                 │
│  - chat.message                │
│  - chat.converse               │
│  - Socket.IO                   │
└────────────────────────────────┘
```

## 安装

本插件已集成在 Tailchat 项目中，无需单独安装。

如需启用，请确保在 Tailchat 配置中启用插件：

```javascript
// server/.env
PLUGINS=com.openclaw.guyu
```

## API 接口

### 发送消息

```http
POST /open-apis/im/v1/messages
Content-Type: application/json

{
  "chat_type": "p2p",
  "receive_id": "user_123",
  "content": "{\"text\": \"你好\"}",
  "message_type": "text"
}
```

### WebSocket 连接

```http
GET /v3/im/ws?app_id=your_app_id&token=your_token
```

## 配置

在 Tailchat 配置文件中添加：

```yaml
guyu:
  heartbeatInterval: 60000  # 心跳间隔 (毫秒)
  connectionTimeout: 300000  # 连接超时 (毫秒)
  debug: true  # 调试模式
```

## 开发

### 目录结构

```
com.openclaw.guyu/
├── models/              # 数据模型
│   ├── guyu-connection.ts
│   └── message-mapping.ts
├── services/            # 微服务
│   ├── guyu-api.service.ts
│   └── guyu-ws.service.ts
├── lib/                 # 工具库
│   ├── message-converter.ts
│   └── chat-type-mapper.ts
├── i18n/                # 国际化
│   └── zh-CN.yml
├── routes/              # HTTP 路由
├── index.js             # 插件入口
└── package.json
```

### 本地开发

```bash
cd /home/leshines/program/nodejs/tailchat
pnpm dev
```

插件会自动热重载。

## 命名由来

**谷雨** - 春季最后一个节气，雨生百谷，万物生长  
**古语** - 谐音，古老智慧的语言，AI 助手的温柔低语

寓意我们的 AI 助手像谷雨一样滋润用户，用温柔智慧的语言与人交流。

## 许可证

MIT License

## 作者

陆小千

---

🌱 雨生百谷 · 古语传情
