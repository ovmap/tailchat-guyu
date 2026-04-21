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
import AppCredential from '../models/app-credential';
import GuyuConnection from '../models/guyu-connection';
import { convertToOpenClawEvent } from '../lib/message-converter';
import { pbbp2 } from '../lib/pbbp2';
import { Types } from 'mongoose';

// FrameType enum
const FrameType = {
  control: 0,
  data: 1,
};

// MessageType enum
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
}

class GuyuHttpService extends TcService {
  private fastify: any;
  private wss?: WebSocketServer;
  private clients = new Map<string, WSClient>();
  private heartbeatTimer?: NodeJS.Timeout;

  get serviceName() {
    return 'plugin:com.openclaw.guyu.http';
  }

  onInit() {
    console.log('⚙️  [GuYu HTTP] onInit() called');
    // 不需要注册 action，HTTP 路由由 Fastify 处理
  }

  async onStart() {
    console.log('🚀 [GuYu HTTP] onStart() called');
    this.logger.info('🚀 Starting GuYu HTTP Service on port 3080...');

    // 创建 Fastify 实例
    this.fastify = Fastify({
      logger: false,
      trustProxy: true,
    });

    console.log('⚙️  [GuYu HTTP] Fastify instance created');
    this.logger.info('⚙️  Creating Fastify instance...');

    // 注册 HTTP 路由
    this.registerHttpRoutes();

    console.log('📝 [GuYu HTTP] Routes registered');
    this.logger.info('📝 HTTP routes registered');

    // 启动 HTTP 服务器
    console.log('🔊 [GuYu HTTP] Calling fastify.listen(3080)...');
    await this.fastify.listen({ port: 3080, host: '0.0.0.0' });

    console.log('✅ [GuYu HTTP] Server listening on 3080');
    this.logger.info('✅ GuYu HTTP Service started on port 3080');
    this.logger.info('📡 HTTP paths: /open-apis/*, /callback/*');

    // 创建 WebSocket Server
    this.wss = new WebSocketServer({
      noServer: true,
      path: '/v3/im/ws',
    });

    // 处理 HTTP upgrade 事件
    this.fastify.server.on('upgrade', (request, socket, head) => {
      const pathname = request.url?.split('?')[0] || '';

      if (pathname === '/v3/im/ws') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // 监听 WebSocket 连接
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      this.handleWebSocketConnection(ws, req);
    });

    this.logger.info('🔌 WebSocket endpoint: /v3/im/ws');

    // 启动心跳检查
    this.startHeartbeatCheck();

    // 监听 Tailchat 消息事件
    this.registerEventListener(
      'chat.message.updateMessage',
      this.onMessageUpdate.bind(this)
    );

    console.log('✅ [GuYu HTTP] Fully initialized');
    this.logger.info('✅ GuYu HTTP Service fully initialized');
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
    this.fastify.post(
      '/open-apis/auth/v3/tenant_access_token/internal',
      async (req: any, reply: any) => {
        try {
          const { app_id, app_secret } = req.body;

          this.logger.info(`🔑 Token request: app_id=${app_id}`);

          const credential = await AppCredential.findOne({
            appId: app_id,
            appSecret: app_secret,
            isActive: true,
          });

          if (!credential) {
            return {
              code: 10003,
              msg: 'invalid app_id or app_secret',
              tenant_access_token: '',
              expire: 0,
            };
          }

          const tenantAccessToken = `t-${app_id}-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          this.logger.info(`✅ Token generated: ${app_id}`);

          return {
            code: 0,
            msg: 'success',
            tenant_access_token: tenantAccessToken,
            expire: 7200,
          };
        } catch (error: any) {
          this.logger.error('Get token error:', error);
          return {
            code: 500,
            msg: error.message,
            tenant_access_token: '',
            expire: 0,
          };
        }
      }
    );

    // POST /callback/ws/endpoint
    this.fastify.post('/callback/ws/endpoint', async (req: any, reply: any) => {
      try {
        // 飞书 SDK 发送的是大写 AppID/AppSecret，需要兼容
        const appId = req.body?.AppID || req.body?.app_id;
        const appSecret = req.body?.AppSecret || req.body?.app_secret;

        this.logger.info(`🔌 WS endpoint registration: appId=${appId}`);

        const credential = await AppCredential.findOne({
          appId,
          appSecret,
          isActive: true,
        });

        if (!credential) {
          return {
            code: 10003,
            msg: 'invalid app_id or app_secret',
          };
        }

        await GuyuConnection.findOneAndUpdate(
          { appId },
          {
            $set: {
              isActive: true,
              lastHeartbeat: new Date(),
            },
          } as any,
          { upsert: true, new: true }
        );

        const logId = `log-${Date.now()}`;
        const wsUrl = `ws://localhost:3080/v3/im/ws?app_id=${appId}&app_secret=${appSecret}`;

        return {
          code: 0,
          msg: 'success',
          data: {
            URL: wsUrl,
            ClientConfig: {
              PingInterval: 30,
              ReconnectCount: 3,
              ReconnectInterval: 10,
              ReconnectNonce: Math.floor(Date.now() / 1000),
            },
            log_id: logId,
          },
        };
      } catch (error: any) {
        this.logger.error('Register WS endpoint error:', error);
        return {
          code: 500,
          msg: error.message,
        };
      }
    });

    // POST /open-apis/im/v1/messages
    this.fastify.post(
      '/open-apis/im/v1/messages',
      async (req: any, reply: any) => {
        try {
          const { receive_id, msg_type, content, chat_type } = req.body;

          this.logger.info(
            `📤 Send message: receive_id=${receive_id}, chat_type=${chat_type}`
          );

          return {
            code: 0,
            msg: 'success',
            data: {
              message_id: `msg_${Date.now()}`,
            },
          };
        } catch (error: any) {
          this.logger.error('Send message error:', error);
          return {
            code: 500,
            msg: error.message,
          };
        }
      }
    );

    // POST /bot/v1/openclaw_bot/ping
    this.fastify.post('/bot/v1/openclaw_bot/ping', async () => {
      return {
        code: 0,
        msg: 'success',
      };
    });
  }

  /**
   * 处理 WebSocket 连接
   */
  private async handleWebSocketConnection(ws: WebSocket, req: any) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const appId = url.searchParams.get('app_id') || '';
      const token =
        url.searchParams.get('token') ||
        url.searchParams.get('app_secret') ||
        '';

      this.logger.info(`🔌 WebSocket connection: appId=${appId}`);

      if (!appId) {
        ws.close(1008, 'Missing app_id');
        return;
      }

      if (token) {
        const credential = await AppCredential.findOne({
          appId,
          appSecret: token,
          isActive: true,
        });

        if (!credential) {
          this.logger.warn(`⚠️ Invalid credentials: ${appId}`);
          ws.close(1008, 'Invalid app_id or app_secret');
          return;
        }
      }

      const client: WSClient = {
        ws,
        appId,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
        isAlive: true,
      };
      this.clients.set(appId, client);

      this.logger.info(`✅ WebSocket connected: ${appId}`);

      // 发送 protobuf pong 握手
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

      this.logger.info('📨 Sent protobuf pong handshake');

      ws.on('message', (data) => this.handleWebSocketMessage(appId, ws, data));
      ws.on('close', () => this.handleWebSocketClose(appId));
      ws.on('error', (error) => this.handleWebSocketError(appId, error));
      ws.on('pong', () => {
        client.isAlive = true;
        client.lastHeartbeat = new Date();
      });
    } catch (error: any) {
      this.logger.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal error');
    }
  }

  /**
   * 处理 WebSocket 消息
   */
  private async handleWebSocketMessage(
    appId: string,
    ws: WebSocket,
    data: any
  ) {
    try {
      const frame = pbbp2.Frame.decode(
        data instanceof Uint8Array ? data : new Uint8Array(data)
      );
      const typeHeader: any = frame.headers?.find((h: any) => h.key === 'type');
      const type = typeHeader ? typeHeader.value : undefined;

      if (type === MessageType.ping) {
        this.logger.info(`💓 Received ping from: ${appId}`);

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

        ws.send(pbbp2.Frame.encode(pongFrame).finish());
        this.logger.info(`💓 Sent pong to: ${appId}`);
      }
    } catch (error: any) {
      this.logger.error('WebSocket message error:', error);
    }
  }

  /**
   * 处理 WebSocket 关闭
   */
  private handleWebSocketClose(appId: string) {
    this.clients.delete(appId);
    this.logger.info(`🔌 WebSocket disconnected: ${appId}`);
  }

  /**
   * 处理 WebSocket 错误
   */
  private handleWebSocketError(appId: string, error: Error) {
    this.logger.error(`❌ WebSocket error: ${appId}`, error.message);
    this.clients.delete(appId);
  }

  /**
   * 监听 Tailchat 消息更新
   */
  private async onMessageUpdate(event: any) {
    try {
      const { type, converseId, messageId, author, content } = event.data;

      if (await this.isBotMessage(author)) {
        this.logger.debug(`🚫 Skipping bot message: ${messageId}`);
        return;
      }

      const appId = await this.findAppIdByConverse(converseId);
      if (!appId) {
        return;
      }

      const client = this.clients.get(appId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const openClawEvent = convertToOpenClawEvent({
        messageId,
        converseId,
        author,
        content,
        createdAt: new Date(),
        chatType: event.data.chatType || 'dm',
      });

      const feishuEvent = {
        schema: '2.0',
        header: {
          event_id: openClawEvent.header.event_id,
          event_type: openClawEvent.header.event_type,
          token: 'mock_token',
          app_id: appId,
          tenant_key: 'tenant_mock',
          ts: Math.floor(Date.now() / 1000).toString(),
        },
        event: openClawEvent.event,
      };

      const eventFrame: pbbp2.IFrame = {
        method: FrameType.data,
        headers: [
          { key: 'type', value: MessageType.event },
          { key: 'event_type', value: openClawEvent.header.event_type },
          { key: 'message_id', value: messageId },
          { key: 'sum', value: '1' },
          { key: 'seq', value: '0' },
          { key: 'trace_id', value: `trace_${Date.now()}` },
        ],
        payload: new TextEncoder().encode(JSON.stringify(feishuEvent)),
        SeqID: 0,
        LogID: 0,
        service: 0,
      };

      const encoded = pbbp2.Frame.encode(eventFrame).finish();
      client.ws.send(encoded);

      this.logger.info(`✅ Message pushed to: ${appId}`);
    } catch (error: any) {
      this.logger.error('Message push error:', error);
    }
  }

  /**
   * 检查是否是机器人消息
   */
  private async isBotMessage(authorId: string): Promise<boolean> {
    try {
      const userInfo: any = await this.broker.call('user.getUserInfo', {
        userId: authorId,
      });
      return (userInfo as any)?.type === 'pluginBot';
    } catch (error) {
      return false;
    }
  }

  /**
   * 通过会话 ID 查找 appId
   */
  private async findAppIdByConverse(
    converseId: string
  ): Promise<string | null> {
    try {
      const connection = await GuyuConnection.findOne({
        converseId: new Types.ObjectId(converseId),
        isActive: true,
      });
      return connection?.appId || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 启动心跳检查
   */
  private startHeartbeatCheck() {
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();
      const timeout = 90 * 1000;

      for (const [appId, client] of this.clients.entries()) {
        if (client.ws.readyState !== WebSocket.OPEN) {
          this.clients.delete(appId);
          continue;
        }

        const timeSinceLastHeartbeat =
          now.getTime() - client.lastHeartbeat.getTime();

        if (!client.isAlive || timeSinceLastHeartbeat > timeout) {
          this.logger.warn(`⚠️ Connection timeout: ${appId}`);
          client.ws.terminate();
          this.clients.delete(appId);
          continue;
        }

        client.isAlive = false;
        client.ws.ping();
      }
    }, 30 * 1000);

    this.logger.info('💓 Heartbeat check started (30s interval, 90s timeout)');
  }
}

export default GuyuHttpService;
