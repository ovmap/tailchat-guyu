# Tailchat + Guyu (谷雨)

[![Docker Publish](https://github.com/msgbyte/tailchat/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/msgbyte/tailchat/actions/workflows/docker-publish.yml)
![Docker Image Version (tag latest semver)](https://img.shields.io/docker/v/moonrailgun/tailchat/latest)
![Docker Pulls](https://img.shields.io/docker/pulls/moonrailgun/tailchat)
[![CI](https://github.com/msgbyte/tailchat/actions/workflows/ci.yaml/badge.svg)](https://github.com/msgbyte/tailchat/actions/workflows/ci.yaml)
[![Codemagic build status](https://api.codemagic.io/apps/63e27be62b9d4ca848b5491d/android/status_badge.svg)](https://codemagic.io/apps/63e27be62b9d4ca848b5491d/android/latest_build)
[![Desktop Build](https://github.com/msgbyte/tailchat/actions/workflows/desktop-build.yml/badge.svg)](https://github.com/msgbyte/tailchat/actions/workflows/desktop-build.yml)
[![deploy nightly](https://github.com/msgbyte/tailchat/actions/workflows/vercel-nightly.yml/badge.svg)](https://github.com/msgbyte/tailchat/actions/workflows/vercel-nightly.yml)

[English](./README.md)

## 集成 OpenClaw 的下一代 noIM 应用

### Tailchat + 谷雨：你的私有化 OpenClaw 网关

本项目是 **Tailchat** 的增强版本，集成了 **谷雨 (Guyu)** 服务，提供：

- **OpenClaw 集成**：通过 WebSocket 实现完整的实时消息传递，支持私有化部署 OpenClaw
- **飞书/Lark 协议兼容**：无缝桥接 OpenClaw 机器人到 Tailchat
- **机器人管理**：通过直观的管理面板创建和管理机器人账号
- **实时双向消息**：Tailchat 与 OpenClaw 之间的即时消息传递

## 为什么选择谷雨 + OpenClaw？

OpenClaw 是一个强大的 AI 智能体框架，但将其私有化部署并与 IM 集成一直是个挑战。**谷雨 (Guyu)** 完美解决了这个问题：

1. **完全隐私控制**：所有服务部署在自己的基础设施上，无第三方依赖
2. **飞书协议桥接**：OpenClaw 使用飞书协议，谷雨将其翻译为 Tailchat 原生消息
3. **实时 WebSocket 连接**：亚秒级消息传递，带心跳健康检查
4. **多租户支持**：一个谷雨实例可同时服务多个 OpenClaw 应用
5. **插件化架构**：无需修改核心代码即可扩展功能

### 架构

```
┌─────────────┐     REST/WebSocket      ┌─────────────┐
│  前端       │ ←────────────────────→ │  后端       │
│  (管理界面) │                        │  谷雨服务   │
└─────────────┘                        └──────┬──────┘
                                              │
                                              │ Channel SDK
                                              ▼
                                       ┌─────────────┐
                                       │  OpenClaw   │
                                       │  网关       │
                                       └─────────────┘
```

## 快速开始 - 私有化部署 OpenClaw

### 前置要求

- Docker & Docker Compose
- MongoDB
- Redis

### Docker 部署

```bash
# 克隆仓库
git clone https://github.com/msgbyte/tailchat.git
cd tailchat

# 启动所有服务
docker-compose up -d
```

### 配置谷雨 + OpenClaw

1. 访问 Tailchat Web 界面（默认：`http://localhost:3000`）
2. 从侧边栏导航到 **谷雨** 插件
3. 创建新应用并启用 Bot 能力
4. 复制 `App ID` 和 `App Secret`
5. 使用这些凭证配置你的 OpenClaw 实例
6. OpenClaw 通过 WebSocket 连接：`ws://your-server:3080/open-apis/ws`

## 特性

### Tailchat 核心功能

- **隐私优先**：仅邀请加入群组，无公开发现
- **防骚扰**：好友请求需要昵称 + 随机标识符
- **二维群组空间**：通过面板和频道组织对话
- **高度可定制**：拖拽创建群组，通过插件扩展功能
- **微服务后端**：支持大规模集群部署
- **跨平台**：Web、桌面端 (Electron) 和移动端 (React Native)

### 谷雨 (Guyu) OpenClaw 集成

- **OpenClaw 网关**：完整的 WebSocket 桥接，实现实时消息传递
- **飞书协议兼容**：可直接替代飞书机器人集成
- **机器人管理界面**：创建应用、启用机器人能力、管理凭证
- **消息格式转换**：OpenClaw 与 Tailchat 格式之间的自动转换
- **心跳监控**：自动连接健康检查和恢复
- **多连接支持**：一个谷雨服务器可服务多个 OpenClaw 实例
- **群组和私聊**：机器人同时支持私聊和群组频道

## 截图预览

### 谷雨管理面板

![谷雨应用管理](./website/static/img/guyu/guyu1.png)

![谷雨应用配置](./website/static/img/guyu/guyu2.png)

### 机器人集成

![谷雨机器人设置](./website/static/img/guyu/guyu3.png)

![谷雨 OpenClaw 连接](./website/static/img/guyu/guyu4.png)

### 应用凭证

![谷雨应用凭证配置](./website/static/img/guyu/guyu5.png)

## 性能与扩展

Tailchat 基于 **React** + **TypeScript** 构建，具备：

- **前端微内核架构**：基于插件的扩展系统
- **后端微服务架构**：使用 Moleculer 框架实现分布式服务
- **谷雨服务**：专用的 OpenClaw 网关，提供 WebSocket 和 HTTP API

插件系统让二次开发变得非常简单——谷雨本身就是作为 Tailchat 插件实现的。

**注意**：虽然 Tailchat 的核心功能已处于稳定阶段，但面向第三方开发者的 API 仍在不断完善中。一般来说保持向下兼容，但不排除出现 Breaking Change 的可能性。

## 技术细节

### 谷雨服务列表

| 服务 | 端口 | 协议 | 描述 |
|------|------|------|------|
| guyu.http | 3080 | HTTP/WebSocket | OpenClaw 网关，兼容飞书 API |
| guyu.bot | 内部 | Moleculer | 机器人账号管理、消息路由 |
| guyu.app | 内部 | Moleculer | 应用 CRUD、密钥生成 |
| guyu.integration | 内部 | Moleculer | 第三方集成辅助功能 |

### 消息流程

1. 用户在 Tailchat 中发送消息 → 触发收件箱事件
2. 机器人服务检测到 @谷雨机器人 的提及
3. 消息转换为飞书事件格式
4. 通过 WebSocket 推送到已连接的 OpenClaw 实例
5. OpenClaw 处理并回复
6. 回复消息路由回对应的 Tailchat 对话

## 开发指南

### 本地环境搭建

详见 [SETUP_GUIDE.md](./SETUP_GUIDE.md) 获取本地开发环境的完整配置说明。

### 关键环境变量

```env
# 谷雨 HTTP 服务
GUYU_HTTP_PORT=3080

# OpenClaw 网关
OPENCLAW_WS_URL=ws://localhost:3080/open-apis/ws
```

## 文档资源

- [Tailchat 官方文档](https://tailchat.msgbyte.com/)
- [OpenClaw 文档](https://openclaw.dev/)
- [飞书机器人 API参考](https://open.feishu.cn/document/)

## 在线体验

**Nightly 版本**: [https://nightly.paw.msgbyte.com/](https://nightly.paw.msgbyte.com/)

> Nightly 版本为自动编译版本，即每次提交代码都会自动编译。不保证数据的可靠性与稳定性 - 生产环境请使用 Docker 镜像或 GitHub Release 版本。

## 快速部署

### 使用 Sealos 部署

[![Deploy on Sealos](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://cloud.sealos.io/?openapp=system-template%3FtemplateName%3Dtailchat)

### 使用 ClawCloud Run 部署

[![Run on ClawCloud](https://raw.githubusercontent.com/ClawCloud/Run-Template/refs/heads/main/Run-on-ClawCloud.svg)](https://template.run.claw.cloud/?referralCode=R8D5TGYVHBNJ&openapp=system-fastdeploy%3FtemplateName%3Dtailchat)

### 使用宝塔快速部署

[使用宝塔部署一键部署](https://tailchat.msgbyte.com/zh-Hans/docs/deployment/other-way/bt)

## 交流社区

对 Tailchat 或谷雨感兴趣？欢迎加入我们的社区！

### Tailchat

[Tailchat Nightly Group](https://nightly.paw.msgbyte.com/invite/8Jfm1dWb)

### 微信

<img width="360" src="./website/static/img/wechat2.jpg" />

## 项目活动

![Alt](https://repobeats.axiom.co/api/embed/b85cb500d902e0ad0cecb582557c006d8b663a01.svg "Repobeats analytics image")

## 开源协议

[Apache 2.0](./LICENSE)
