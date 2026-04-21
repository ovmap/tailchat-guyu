/**
 * WebSocket Mixin - 原生 WebSocket 支持
 *
 * 为 Tailchat 服务添加原生 WebSocket 能力
 * 挂载到现有的 HTTP 服务器上，不创建新服务器
 *
 * @author 陆小千
 * @version 1.0.0
 */

import WebSocket from 'ws';
import { PureService, PureServiceSchema, Errors } from 'tailchat-server-sdk';
import { isValidStr } from '../lib/utils';

/**
 * WebSocket 连接处理器
 */
interface WebSocketConnectionHandler {
  (ws: WebSocket, req: any): void | Promise<void>;
}

/**
 * WebSocket Mixin 配置选项
 */
interface WebSocketMixinOptions {
  /**
   * WebSocket 路径
   * 例如：'/v3/im/ws', '/ws', '/open-apis/ws'
   */
  path: string;

  /**
   * 连接处理函数
   */
  onConnection: WebSocketConnectionHandler;

  /**
   * 是否启用认证（默认 true）
   */
  enableAuth?: boolean;
}

/**
 * WebSocket 服务接口
 */
interface WebSocketService extends PureService {
  wss: WebSocket.Server;
  wsCloseCallbacks: (() => Promise<unknown>)[];
}

/**
 * WebSocket Mixin
 *
 * 使用方式:
 * ```typescript
 * class MyService extends TcService {
 *   async started() {
 *     // 获取 Gateway 的 HTTP 服务器
 *     const gatewayService = this.broker.services.find(s => s.name === 'gateway');
 *     const server = gatewayService?.server;
 *
 *     // 创建 WebSocket Server 并挂载
 *     this.wss = new WebSocket.Server({ server, path: '/v3/im/ws' });
 *   }
 * }
 * ```
 */
export const WebSocketMixin = (
  options: WebSocketMixinOptions
): Partial<PureServiceSchema> => {
  const { path, onConnection, enableAuth = true } = options;

  const schema: Partial<PureServiceSchema> = {
    /**
     * 服务创建时
     */
    created(this: WebSocketService) {
      this.wsCloseCallbacks = [];
      this.logger.debug(`🔌 WebSocket Mixin created for path: ${path}`);
    },

    /**
     * 服务启动时
     */
    async started(this: WebSocketService) {
      this.logger.info(`🚀 Starting WebSocket server at ${path}`);

      // 1. 获取 Gateway 的 HTTP 服务器
      const gatewayService = this.broker.services.find(
        (s) => s.name === 'gateway' || s.name === 'api'
      );

      const server = gatewayService?.server;
      if (!server) {
        throw new Errors.ServiceNotAvailableError(
          'WebSocket Mixin requires ApiGatewayMixin to be registered first. ' +
            'Please ensure gateway service is available.'
        );
      }

      this.logger.info('✅ Found HTTP server from ApiGatewayMixin');

      // 2. 创建 WebSocket Server 并挂载到现有服务器
      // 注意：不指定 port，只指定 server 和 path
      this.wss = new WebSocket.Server({
        server, // 使用现有的 HTTP 服务器
        path, // WebSocket 路径
      });

      this.logger.info(`✅ Native WebSocket server started at ${path}`);
      this.logger.info(`📡 WebSocket path: ${path}`);
      this.logger.info(
        `🔐 Authentication: ${enableAuth ? 'enabled' : 'disabled'}`
      );

      // 3. 监听连接事件
      this.wss.on('connection', (ws: WebSocket, req: any) => {
        this.logger.info(
          `🔌 New WebSocket connection from ${req.socket.remoteAddress}`
        );
        this.logger.debug(`📍 URL: ${req.url}`);

        // 处理连接
        try {
          const result = onConnection(ws, req);
          if (result instanceof Promise) {
            result.catch((err) => {
              this.logger.error('❌ Connection handler error:', err);
              ws.close(1011, 'Internal error');
            });
          }
        } catch (error: any) {
          this.logger.error('❌ Connection handler error:', error.message);
          ws.close(1011, 'Internal error');
        }
      });

      // 4. 监听错误
      this.wss.on('error', (error: Error) => {
        this.logger.error('❌ WebSocket server error:', error.message);
      });

      // 5. 监听关闭
      this.wss.on('close', () => {
        this.logger.info('👋 WebSocket server closed');
      });

      this.logger.info(`✅ WebSocket Mixin started successfully`);
    },

    /**
     * 服务停止时
     */
    async stopped(this: WebSocketService) {
      this.logger.info('🛑 Stopping WebSocket server...');

      if (this.wss) {
        // 关闭所有连接
        this.logger.info(
          `🔌 Closing ${this.wss.clients.size} active connections...`
        );

        for (const client of this.wss.clients) {
          client.close(1001, 'Server shutting down');
        }

        // 等待清理回调执行
        if (this.wsCloseCallbacks.length > 0) {
          this.logger.info(
            `⏳ Executing ${this.wsCloseCallbacks.length} cleanup callbacks...`
          );
          await Promise.all(this.wsCloseCallbacks.map((fn) => fn()));
        }

        // 关闭服务器（不关闭底层 HTTP 服务器）
        this.wss.close(() => {
          this.logger.info('✅ WebSocket server closed');
        });
      }

      this.logger.info('👋 WebSocket Mixin stopped');
    },

    /**
     * 服务方法
     */
    methods: {
      /**
       * 获取活跃连接数
       */
      getConnectedCount(this: WebSocketService): number {
        return this.wss?.clients?.size || 0;
      },

      /**
       * 广播消息给所有连接
       */
      broadcast(this: WebSocketService, data: string | Buffer): number {
        if (!this.wss) {
          this.logger.warn('⚠️ WebSocket server not started');
          return 0;
        }

        let count = 0;
        for (const client of this.wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
            count++;
          }
        }

        this.logger.debug(`📢 Broadcast to ${count} clients`);
        return count;
      },
    },
  };

  return schema;
};

/**
 * 工具函数：从 URL 解析查询参数
 */
export function parseQuery(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const params: Record<string, string> = {};

    for (const [key, value] of urlObj.searchParams.entries()) {
      params[key] = value;
    }

    return params;
  } catch (error) {
    return {};
  }
}

/**
 * 工具函数：从请求中提取 Token
 */
export function extractToken(req: any): string | null {
  // 1. 从 URL 参数获取
  const urlParams = parseQuery(req.url);
  if (urlParams.token) {
    return urlParams.token;
  }

  // 2. 从 Authorization Header 获取
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. 从 app_secret 参数获取（飞书兼容）
  if (urlParams.app_secret) {
    return urlParams.app_secret;
  }

  return null;
}

export default WebSocketMixin;
