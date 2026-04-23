/**
 * GuYu HTTP 服务
 *
 * 独立 HTTP 服务器，监听 3080端口
 * 提供飞书 SDK 兼容的 HTTP API 和 WebSocket
 *
 * @author 陆小千
 * @version 1.0.0
 */

import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import { TcService, TcContext } from 'tailchat-server-sdk';
import { Types } from 'mongoose';
import { pbbp2 } from './lib/pbbp2.js';

const FrameType = {
  control: 0,
  data: 1,
};

const MessageType = {
  event: 'event',
  card: 'card',
  ping: 'ping',
  pong: 'pong',
};

interface WSClient {
  ws: WebSocket;
  appId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  isAlive: boolean;
  heartbeatTimer?: NodeJS.Timeout;  // ✅ 添加定时器引用
}

class GuyuHttpService extends TcService {
  private fastify: any;
  private wss?: WebSocketServer;
  private clients = new Map<string, WSClient>();
  private heartbeatTimer?: NodeJS.Timeout;
  // ✅ 缓存消息 ID 到群组信息的映射，用于回复消息时获取群组信息
  // message_id → { converseId, groupId }
  private messageCache = new Map<string, { converseId: string; groupId: string }>();
  private messageCacheTimeout = 10 * 60 * 1000; // 10分钟过期

  get serviceName() {
    return 'guyu.http';
  }

  onInit() {
    // ✅ pushMessage 是内部方法，不注册为 Moleculer Action
    // bot.service 会直接调用 pushToClient 方法
  }

  async onStart() {
    this.logger.info('🚀 Starting GuYu HTTP Service on port 3080...');

    // 创建 Fastify 实例
    this.fastify = Fastify({
      logger: false,
      trustProxy: true,
    });

    // 启动缓存清理定时器（每分钟清理过期缓存）
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      // 简单策略：如果缓存条目过多，可以清空
      if (this.messageCache.size > 1000) {
        this.messageCache.clear();
        this.logger.info('🧹 清理消息缓存（超过1000条）');
      }
    }, 5 * 60 * 1000);  // 每5分钟检查一次

    // ✅ 先创建 WebSocket Server（在 listen 之前）
    this.wss = new WebSocketServer({
      noServer: true,
    });

    // 处理 HTTP upgrade 事件（必须在 listen 之前绑定）
    this.fastify.server.on('upgrade', (request, socket, head) => {
      const pathname = request.url?.split('?')[0] || '';
      
      this.logger.info(`🔌 WebSocket upgrade 请求: ${pathname}`);
      this.logger.info(`🔌 URL: ${request.url}`);
      
      // 支持多个 WebSocket 端点
      if (pathname === '/open-apis/ws' || 
          pathname === '/v3/im/ws' || 
          pathname === '/callback/ws/endpoint') {
        this.logger.info(`✅ 处理 WebSocket upgrade: ${pathname}`);
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      } else {
        this.logger.warn(`⚠️ 未知 WebSocket 路径: ${pathname}，拒绝连接`);
        socket.destroy();
      }
    });

    // 监听 WebSocket 连接
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.handleWebSocketConnection(ws, req);
    });

    // 注册 HTTP 路由
    this.registerHttpRoutes();

    // 添加调试路由，确认服务正常
    this.fastify.get('/debug/ws-info', async () => {
      return {
        status: 'ok',
        wsEndpoints: ['/open-apis/ws', '/v3/im/ws', '/callback/ws/endpoint'],
        connectedClients: this.clients.size,
      };
    });

    // ✅ 最后启动 HTTP 服务器
    await this.fastify.listen({ port: 3080, host: '0.0.0.0' });
    this.logger.info('✅ GuYu HTTP Service started on port 3080');

    this.logger.info('🔌 WebSocket endpoints:');
    this.logger.info('   - /open-apis/ws');
    this.logger.info('   - /v3/im/ws');
    this.logger.info('   - /callback/ws/endpoint');

    // 启动心跳检查
    this.startHeartbeatCheck();
  }

  async stopped() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.wss) {
      this.wss.close();
    }
    if (this.fastify) {
      await this.fastify.close();
    }
    this.logger.info('👋 GuYu HTTP Service stopped');
  }

  /**
   * 注册 HTTP 路由
   */
  private registerHttpRoutes() {
    // POST /open-apis/auth/v3/tenant_access_token/internal
    this.fastify.post('/open-apis/auth/v3/tenant_access_token/internal', async (req: any, res: any) => {
      const { app_id, app_secret } = req.body;
      
      // 模拟飞书认证响应
      if (app_id && app_secret) {
        return {
          code: 0,
          msg: 'ok',
          tenant_access_token: 'mock_token_' + Date.now(),
          expire: 7200,
        };
      }
      
      return {
        code: 10003,
        msg: 'invalid app_id or app_secret',
        tenant_access_token: '',
        expire: 0,
      };
    });

    // POST /callback/ws/endpoint
    // OpenClaw 注册 WebSocket 回调端点
    this.fastify.post('/callback/ws/endpoint', async (req: any, res: any) => {
      const body = req.body;
      
      // ✅ 飞书 SDK 使用大写 AppID/AppSecret
      const appId = body?.AppID || body?.app_id;
      const appSecret = body?.AppSecret || body?.app_secret;
      const logId = req.headers['x-log-id'] || `log-${Date.now()}`;
      
      this.logger.info('📝 注册 WebSocket 回调端点:', { 
        appId, 
        logId,
        bodyKeys: body ? Object.keys(body) : []
      });
      
      // ✅ 返回飞书 SDK 期望的格式：ClientConfig 包含 PingInterval
      return {
        code: 0,
        msg: 'success',
        data: {
          URL: `ws://localhost:3080/v3/im/ws?app_id=${appId}`,
          ClientConfig: {
            PingInterval: 30,
            ReconnectCount: 3,
            ReconnectInterval: 10,
            ReconnectNonce: Math.floor(Date.now() / 1000),
          },
          log_id: logId,
        },
      };
    });

    // POST /callback/ws/ping
    // OpenClaw 心跳检测
    this.fastify.post('/callback/ws/ping', async (req: any, res: any) => {
      return {
        code: 0,
        msg: 'ok',
        data: {
          pong: Date.now(),
        },
      };
    });

    // GET /callback/ws/status
    // 查询 WebSocket 回调状态
    this.fastify.get('/callback/ws/status', async (req: any, res: any) => {
      return {
        code: 0,
        msg: 'ok',
        data: {
          connected: true,
          clients: this.clients.size,
        },
      };
    });

    // POST /open-apis/im/v1/messages
    // OpenClaw 插件调用此接口发送消息回复
    this.fastify.post('/open-apis/im/v1/messages', async (req: any, res: any) => {
      const { receive_id, msg_type, content } = req.body;
      
      this.logger.info('📥 收到 OpenClaw 消息发送请求:', { 
        receive_id, 
        msg_type: msg_type || 'text',
        contentLength: content?.length || 0
      });
      
      try {
        // 解析内容
        let contentJson: any;
        try {
          contentJson = JSON.parse(content);
        } catch {
          contentJson = { text: content };
        }

        // ✅ 解析 receive_id：群组消息时 receive_id 就是 groupId
        const groupId = receive_id;
        const converseId = receive_id;

        // ✅ lark 插件不会携带 app_id，需要从当前 WebSocket 客户端获取
        let appId = req.headers['x-app-id'] || 
                    req.headers['X-App-ID'] || 
                    req.query?.app_id || 
                    req.body?.app_id ||
                    req.body?.AppID;
        
        if (!appId && this.clients.size === 1) {
          appId = Array.from(this.clients.keys())[0];
          this.logger.info(`🔑 使用当前连接的客户端 appId: ${appId}`);
        }
        
        if (!appId) {
          this.logger.error('❌ 缺少 app_id，且没有活动的 WebSocket 客户端连接');
          return {
            code: 10001,
            msg: 'Missing app_id and no active WebSocket client',
            data: null,
          };
        }

        // 获取 bot 账号信息
        const botAccount: any = await this.broker.call('guyu.bot.getOrCreateBotAccount', {
          appId,
        });

        this.logger.info('🤖 使用 bot 账号发送消息:', {
          userId: botAccount.userId,
          nickname: botAccount.nickname,
        });

        // 根据 msg_type 构造 Tailchat 消息格式
        let messageContent: any;
        switch (msg_type) {
          case 'text':
            messageContent = {
              type: 'text',
              content: contentJson.text || contentJson,
            };
            break;
          case 'image':
            messageContent = {
              type: 'image',
              content: contentJson.image_key || contentJson.url,
            };
            break;
          case 'post':
            messageContent = {
              type: 'rich',
              title: contentJson.title?.zh_cn || '',
              content: contentJson.content || [],
            };
            break;
          default:
            messageContent = {
              type: 'text',
              content: contentJson.text || contentJson,
            };
        }

        // 调用 Tailchat 发消息接口
        await this.broker.call(
          'chat.message.sendMessage',
          {
            converseId,
            content: JSON.stringify(messageContent),
            groupId,
          },
          {
            meta: {
              userId: botAccount.userId,
            },
          }
        );
        
        this.logger.info('✅ 消息发送成功');
        
        return {
          code: 0,
          msg: 'ok',
          data: {
            message_id: 'om_' + Date.now(),
            chat_id: converseId,
            create_time: Date.now().toString(),
          },
        };
      } catch (e: any) {
        this.logger.error('❌ 发送消息失败:', e);
        return {
          code: 10001,
          msg: e.message || 'Failed to send message',
          data: null,
        };
      }
    });

    // ✅ 新增：回复消息端点（飞书 SDK 用于回复特定消息）
    this.fastify.post('/open-apis/im/v1/messages/:message_id/reply', async (req: any, res: any) => {
      const { message_id } = req.params;
      const { content, msg_type } = req.body;
      
      this.logger.info('📨 收到 OpenClaw 回复消息请求:', { 
        message_id,
        msg_type: msg_type || 'text'
      });
      
      try {
        this.logger.info(`🔍 解析内容: content=${JSON.stringify(content)?.substring(0, 100)}`);
        
        // 解析内容
        let contentJson: any;
        try {
          contentJson = JSON.parse(content);
        } catch {
          contentJson = { text: content };
        }
        
        this.logger.info(`🔍 contentJson:`, contentJson);

        let appId = req.headers['x-app-id'] || 
                    req.headers['X-App-ID'] || 
                    req.query?.app_id || 
                    req.body?.app_id ||
                    req.body?.AppID;
        
        this.logger.info(`🔍 appId: ${appId}, clients.size: ${this.clients.size}`);
        
        if (!appId && this.clients.size === 1) {
          appId = Array.from(this.clients.keys())[0];
        }
        
        if (!appId) {
          this.logger.error('❌ 回复消息缺少 app_id');
          return { code: 10001, msg: 'Missing app_id', data: null };
        }

        this.logger.info(`🔍 获取机器人账号: appId=${appId}`);
        
        const botAccount: any = await this.broker.call('guyu.bot.getOrCreateBotAccount', {
          appId,
        });
        
        this.logger.info(`🔍 botAccount.userId: ${botAccount?.userId}`);

        // ✅ 解析飞书消息格式，提取实际文本内容
        let textContent = '';
        if (contentJson.zh_cn?.content) {
          // 飞书富文本格式：{ zh_cn: { content: [[{tag:"text", text:"..."}]] } }
          const rows = contentJson.zh_cn.content;
          textContent = rows
            .flat()
            .map((item: any) => item.text || '')
            .join('');
          this.logger.info(`📝 提取飞书文本: ${textContent.substring(0, 100)}...`);
        } else if (contentJson.text) {
          textContent = contentJson.text;
        } else {
          textContent = JSON.stringify(contentJson);
        }

        // ✅ Tailchat 消息内容直接是纯文本
        const messageContent = textContent;
        
        this.logger.info(`🔍 messageContent:`, messageContent);

        // 获取群组信息
        // ✅ 优先从请求体获取，如果没有则从缓存中查找（OpenClaw 回复时可能不携带 chat_id）
        const cachedInfo = this.messageCache.get(message_id);
        const converseId = req.body.chat_id || cachedInfo?.converseId;
        const groupId = cachedInfo?.groupId || converseId;
        
        this.logger.info(`🔍 群组信息: req.body.chat_id=${req.body.chat_id}, cached=${JSON.stringify(cachedInfo)}`);
        
        if (!converseId) {
          this.logger.error(`❌ 回复消息缺少 converseId，且缓存中找不到 message_id: ${message_id}`);
          return { code: 10001, msg: 'Missing converseId', data: null };
        }

        this.logger.info(`📤 准备发送消息: converseId=${converseId}, groupId=${groupId}`);
        
        // 调用 Tailchat 发消息接口
        await this.broker.call(
          'chat.message.sendMessage',
          {
            converseId,
            content: JSON.stringify(messageContent),
            groupId,
          },
          {
            meta: {
              userId: botAccount.userId,
            },
          }
        );
        
        this.logger.info(`✅ 回复消息成功: message_id=${message_id}`);
        
        return {
          code: 0,
          msg: 'success',
          data: {
            message_id: 'om_reply_' + Date.now(),
            chat_id: converseId,
            create_time: Date.now().toString(),
          },
        };
      } catch (e: any) {
        this.logger.error('❌ 回复消息失败:', e);
        return {
          code: 10001,
          msg: e.message || 'Failed to reply message',
          data: null,
        };
      }
    });

    // ✅ 新增：获取单条消息
    this.fastify.get('/open-apis/im/v1/messages/:message_id', async (req: any, res: any) => {
      const { message_id } = req.params;
      
      this.logger.info('📝 获取消息:', { message_id });
      
      // ⚠️ Tailchat 的消息查询需要 converseId 和 groupId
      // 这里返回占位数据，实际需要从 Tailchat 查询
      return {
        code: 0,
        msg: 'success',
        data: {
          message_id,
          chat_id: 'unknown',
          message_type: 'text',
          content: JSON.stringify({ text: 'Placeholder' }),
          create_time: Date.now().toString(),
          sender: {
            sender_id: {
              open_id: 'bot_placeholder',
            },
            sender_type: 'user',
          },
        },
      };
    });

    // ✅ 新增：获取消息历史
    this.fastify.get('/open-apis/im/v1/messages', async (req: any, res: any) => {
      const { container_id, page_token, page_size = 20 } = req.query;
      
      this.logger.info('📚 获取消息历史:', { container_id, page_size });
      
      // ⚠️ 返回空列表，实际需要从 Tailchat 查询
      return {
        code: 0,
        msg: 'success',
        data: {
          items: [],
          has_more: false,
        },
      };
    });

    // ✅ 新增：更新消息（飞书 SDK 用于编辑已发送消息）
    this.fastify.put('/open-apis/im/v1/messages/:message_id', async (req: any, res: any) => {
      const { message_id } = req.params;
      const { chat_id, msg_type, content } = req.body;
      
      this.logger.info('📝 更新消息:', { message_id, chat_id });
      
      // ⚠️ Tailchat 目前不支持消息编辑
      return {
        code: 0,
        msg: 'success',
        data: {
          message_id,
          chat_id,
          create_time: Date.now().toString(),
        },
      };
    });

    // GET /open-apis/contact/v3/users/:user_id
    // OpenClaw 获取用户信息
    this.fastify.get('/open-apis/contact/v3/users/:user_id', async (req: any, res: any) => {
      const { user_id } = req.params;
      const user_id_type = req.query.user_id_type || 'open_id';
      
      this.logger.info(`📞 获取用户信息: user_id=${user_id}, user_id_type=${user_id_type}`);
      
      // Mock 用户数据
      const mockUsers: Record<string, any> = {
        'ou_bot_xxx': {
          open_id: 'ou_bot_xxx',
          name: 'AI Assistant',
          en_name: 'AI Assistant',
          nickname: '傻妞',
          avatar_url: '',
          department_id: 'od_test_001',
          status: { is_active: true },
        },
      };
      
      const user = mockUsers[user_id] || {
        open_id: user_id,
        name: user_id.replace('ou_', '').replace('_', ' '),
        en_name: '',
        nickname: '',
        avatar_url: '',
        status: { is_active: true },
      };
      
      return {
        code: 0,
        msg: 'success',
        data: {
          user,
        },
      };
    });

    // POST /open-apis/im/v1/messages/:message_id/reactions
    // OpenClaw 添加消息表情回应（输入指示器）
    this.fastify.post('/open-apis/im/v1/messages/:message_id/reactions', async (req: any, res: any) => {
      const { message_id } = req.params;
      const { reaction_type } = req.body;
      
      const emojiType = reaction_type?.emoji_type || 'unknown';
      
      this.logger.info(`👍 添加表情回应: message_id=${message_id}, emoji_type=${emojiType}`);
      
      // 返回 mock reaction_id
      const reactionId = `or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        code: 0,
        msg: 'success',
        data: {
          reaction_id: reactionId,
        },
      };
    });

    // DELETE /open-apis/im/v1/messages/:message_id/reactions/:reaction_id
    // OpenClaw 删除消息表情回应
    this.fastify.delete('/open-apis/im/v1/messages/:message_id/reactions/:reaction_id', async (req: any, res: any) => {
      const { message_id, reaction_id } = req.params;
      
      this.logger.info(`🗑️ 删除表情回应: message_id=${message_id}, reaction_id=${reaction_id}`);
      
      return {
        code: 0,
        msg: 'success',
        data: null,
      };
    });

    // POST /open-apis/bot/v1/openclaw_bot/ping
    // OpenClaw 插件调用此端点验证机器人身份
    this.fastify.post('/open-apis/bot/v1/openclaw_bot/ping', async (req: any, res: any) => {
      const { needBotInfo } = req.body;
      
      this.logger.info('🤖 收到 bot ping 请求:', { needBotInfo });
      
      return {
        code: 0,
        msg: 'success',
        data: {
          pingBotInfo: {
            botID: 'ou_bot_' + Date.now(),
            botName: 'GuYu Bot',
          },
        },
      };
    });

    // GET /health
    this.fastify.get('/health', async (req: any, res: any) => {
      return {
        status: 'ok',
        service: 'guyu-http',
        timestamp: new Date().toISOString(),
      };
    });
  }

  /**
   * 处理 WebSocket 连接
   */
  private handleWebSocketConnection(ws: WebSocket, req: any) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const appId = url.searchParams.get('app_id');

    // 验证 app_id
    if (!appId) {
      this.logger.warn('⚠️ WebSocket 连接缺少 app_id');
      ws.close(1008, 'Missing app_id');
      return;
    }

    const client: WSClient = {
      ws,
      appId,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      isAlive: true,
    };

    this.clients.set(appId, client);
    this.logger.info(`✅ WebSocket 客户端连接: ${appId}`);

    // 发送 protobuf 编码的 pong 握手
    const pongPayload = JSON.stringify({
      PingInterval: 30,
      ReconnectCount: 3,
      ReconnectInterval: 10,
      ReconnectNonce: Math.floor(Date.now() / 1000),
    });

    const pongFrame: pbbp2.IFrame = {
      method: FrameType.control,
      headers: [{ key: 'type', value: MessageType.pong }],
      payload: new TextEncoder().encode(pongPayload),
      SeqID: 0,
      LogID: 0,
      service: 0,
    };

    const encoded = pbbp2.Frame.encode(pongFrame).finish();
    ws.send(encoded);
    this.logger.info(`📨 发送 protobuf pong 握手:`, pongPayload);

    // 处理 incoming 消息（SDK 的 ping）
    ws.on('message', (data: Buffer) => {
      this.handleWebSocketMessage(ws, data, client);
    });

    // ✅ WebSocket 层心跳（协议级 ping/pong）
    client.heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        this.logger.info(`💓 WebSocket ping 发送到 ${appId}`);
      }
    }, 30000);

    // ✅ 接收 WebSocket 层 ping，回复 pong
    ws.on('ping', () => {
      this.logger.info(`💓 收到 WebSocket ping 来自 ${appId}`);
      ws.pong();
    });

    // ✅ 接收 WebSocket 层 pong（心跳响应）
    ws.on('pong', () => {
      client.isAlive = true;
      client.lastHeartbeat = new Date();
      this.logger.info(`💚 收到 WebSocket pong 来自 ${appId}`);
    });

    ws.on('close', () => {
      // ✅ 清理心跳定时器
      if (client.heartbeatTimer) {
        clearInterval(client.heartbeatTimer);
      }
      this.clients.delete(appId);
      this.logger.info(`👋 WebSocket 客户端断开: ${appId}`);
    });

    ws.on('error', (err) => {
      this.logger.error('WebSocket 错误:', err);
    });
  }

  /**
   * 推送消息到 WebSocket 客户端
   * ✅ 这是内部方法，由 guyu.bot 服务直接调用（不通过 Moleculer Action）
   */
  async pushToClient(appId: string, event: any): Promise<boolean> {

    const client = this.clients.get(appId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn(`⚠️ WebSocket 客户端未连接: ${appId}`);
      return false;
    }

    try {
      // 构造飞书 v2 事件格式
      const eventId = event.header?.event_id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const feishuEvent = {
        schema: '2.0',
        header: {
          event_id: eventId,
          event_type: event.header?.event_type || 'im.message.receive_v1',
          token: 'mock_token',
          app_id: appId,
          tenant_key: 'tenant_mock',
          ts: Math.floor(Date.now() / 1000).toString(),
        },
        event: event.event || event,
      };

      // ✅ 缓存 message_id → { converseId, groupId } 的映射
      // ⚠️ 注意：
      // - converseId 用于广播消息（房间 ID）
      // - groupId 用于群组鉴权（getGroupInfo）
      const eventMessage = feishuEvent.event?.message || feishuEvent.event;
      const originalMessageId = eventMessage?.message_id || '';
      const converseId = eventMessage?.chat_id || '';  // converseId 用于广播
      const groupId = eventMessage?._groupId || converseId;  // groupId 用于鉴权
      
      this.logger.info(`🔍 推送消息调试: originalMessageId=${originalMessageId}, converseId=${converseId}, groupId=${groupId}`);
      
      if (originalMessageId && converseId) {
        this.messageCache.set(originalMessageId, { converseId, groupId });
        this.logger.info(`💾 缓存消息映射: ${originalMessageId} → { converseId: ${converseId}, groupId: ${groupId} }`);
      }

      const eventPayload = JSON.stringify(feishuEvent);

      // 构造 protobuf 帧
      const eventFrame: pbbp2.IFrame = {
        method: FrameType.data,
        headers: [
          { key: 'type', value: MessageType.event },
          { key: 'event_type', value: feishuEvent.header.event_type },
          { key: 'message_id', value: eventId },
          { key: 'sum', value: '1' },
          { key: 'seq', value: '0' },
          { key: 'trace_id', value: `trace_${Date.now()}` },
        ],
        payload: new TextEncoder().encode(eventPayload),
        SeqID: 0,
        LogID: 0,
        service: 0,
      };

      // 编码并发送
      const encoded = pbbp2.Frame.encode(eventFrame).finish();
      client.ws.send(encoded);

      this.logger.info(`📤 推送消息到 openclaw 插件: ${appId}`);
      return true;
    } catch (e: any) {
      this.logger.error('❌ 推送消息失败:', e);
      return false;
    }
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleWebSocketMessage(ws: WebSocket, data: Buffer, client: WSClient) {
    client.lastHeartbeat = new Date();
    client.isAlive = true;

    try {
      // 解码 protobuf 帧
      const frame = pbbp2.Frame.decode(data) as pbbp2.IFrame;

      // 获取消息类型
      const typeHeader = frame.headers?.find((h: any) => h.key === 'type');
      const messageType = typeHeader?.value;

      // 处理 ping - 应用层 Protobuf ping
      if (messageType === MessageType.ping) {
        // ✅ 发送 protobuf 编码的 pong（包含连接参数，与握手时一致）
        const pongPayload = JSON.stringify({
          PingInterval: 30,
          ReconnectCount: 3,
          ReconnectInterval: 10,
          ReconnectNonce: Math.floor(Date.now() / 1000),
        });

        const pongFrame: pbbp2.IFrame = {
          method: FrameType.control,
          headers: [{ key: 'type', value: MessageType.pong }],
          payload: new TextEncoder().encode(pongPayload),
          SeqID: frame.SeqID || 0,
          LogID: frame.LogID || 0,
          service: frame.service || 0,
        };

        const encoded = pbbp2.Frame.encode(pongFrame).finish();
        ws.send(encoded);
        this.logger.info('🏓 收到应用层 ping，发送 pong');
        return;
      }

      // 处理其他消息（未来可以处理 openclaw 插件的响应）
      if (frame.payload) {
        const payloadStr = new TextDecoder().decode(frame.payload);
        this.logger.info('📨 收到 openclaw 消息:', payloadStr.substring(0, 200));
      }
    } catch (e) {
      // 如果不是 protobuf 格式，尝试当作纯文本处理
      const msg = data.toString();
      if (msg === 'ping' || msg === 'heartbeat') {
        ws.send('pong');
        return;
      }
      this.logger.debug('收到非 protobuf 消息:', msg.length, 'bytes');
    }
  }

  /**
   * 启动心跳检查（全局定时器）
   * 用于检测和清理超时客户端
   */
  private startHeartbeatCheck() {
    this.heartbeatTimer = setInterval(() => {
      this.clients.forEach((client, appId) => {
        if (!client.isAlive) {
          // 客户端未响应心跳，断开连接
          if (client.heartbeatTimer) {
            clearInterval(client.heartbeatTimer);
          }
          client.ws.terminate();
          this.clients.delete(appId);
          this.logger.info('⏰ 心跳超时，断开客户端:', appId);
        }
        client.isAlive = false;  // 重置标记，等待下次 pong
      });
    }, 30000);
  }
}

export default GuyuHttpService;