/**
 * GuYu (谷雨) 机器人服务
 * 参考 openapi/bot.service.ts
 */

import { TcService, config, TcContext, call } from 'tailchat-server-sdk';
import { isValidStr } from '../../lib/utils';
import type { GuyuApp } from '../../models/guyu/guyu-app';
import { convertToOpenClawEvent } from './lib/message-converter';

class GuyuBotService extends TcService {
  get serviceName(): string {
    return 'guyu.bot';
  }

  onInit(): void {
    // 监听收件箱消息
    this.registerEventListener('chat.inbox.append', async (payload, ctx) => {
      // ✅ 修正：chat.inbox.append 的事件结构
      // payload = { userId, type, payload: { groupId, converseId, messageId, ... } }
      // 注意：payload.payload 才是真正的消息数据
      const inboxPayload = payload.payload || payload;
      const targetUserId = payload.userId;

      // 只处理 message 类型的 inbox
      if (payload.type !== 'message') {
        return;
      }

      // 使用类型断言告诉 TypeScript 这是 MessageInboxItem 的 payload 部分
      const msgPayload = inboxPayload as any;

      // 获取被 @ 的机器人用户信息
      const userInfo = await call(ctx).getUserInfo(String(targetUserId));

      if (!userInfo) {
        return;
      }

      // 只处理谷雨机器人消息
      if (userInfo.type !== 'pluginBot') {
        return;
      }

      // 检查是否是谷雨机器人（email格式：guyu_xxx@plugin.msgbyte.com）
      const email = userInfo.email;
      if (!email || !email.startsWith('guyu_')) {
        return;
      }

      // 从 email 解析 appId
      const appId = email.split('@')[0].replace('guyu_', '');
      const appInfo: GuyuApp | null = await ctx.call('guyu.app.get', {
        appId,
      });

      if (!appInfo) {
        this.logger.warn('应用未找到, skip.');
        return;
      }

      if (!appInfo.capability.includes('bot')) {
        this.logger.info('应用未启用 Bot 能力, skip.');
        return;
      }

      // 转换为飞书格式并推送到 3080 服务
      try {
        // ✅ 从 inbox payload 中提取消息数据
        const messageData = {
          messageId: msgPayload.messageId,
          author: msgPayload.messageAuthor,
          content: msgPayload.messagePlainContent || msgPayload.messageSnippet || '',
          mentions: [],  // MessageInboxItem 暂时没有此字段
          createdAt: new Date(),
          chatType: msgPayload.groupId ? 'group' : 'dm',
          converseId: msgPayload.converseId,
          groupId: msgPayload.groupId,
          // ✅ 添加实际的群组 ID 到缓存（openclaw 回复时需要）
          _groupId: msgPayload.groupId,  // 用于缓存，回复时使用
          messageType: 'text',
        };

        this.logger.info(`📥 收到 inbox 消息:`, {
          messageId: msgPayload.messageId,
          converseId: msgPayload.converseId,
          groupId: msgPayload.groupId,
        });

        const openclawEvent = convertToOpenClawEvent(messageData);

        // ✅ 直接调用同一进程内的 http 服务（内部通讯，不经过 Moleculer 网络）
        const httpService = this.broker.services.find((s: any) => s.name === 'guyu.http');
        if (!httpService) {
          this.logger.error('❌ guyu.http 服务未找到');
          return;
        }

        const pushed = await httpService.pushToClient(appId, openclawEvent);

        if (pushed) {
          this.logger.info(`✅ 推送消息到 openclaw 插件: ${appId}`);
        } else {
          this.logger.warn(`⚠️ openclaw 插件未连接: ${appId}`);
        }
      } catch (err) {
        this.logger.error('❌ 推送消息失败:', err);
      }
    });

    this.registerAction('login', this.login, {
      params: {
        appId: 'string',
        token: 'string',
      },
    });

    this.registerAction('getOrCreateBotAccount', this.getOrCreateBotAccount, {
      params: {
        appId: 'string',
      },
      visibility: 'public',
    });

    this.registerAuthWhitelist(['/login']);
  }

  /**
   * 登录
   */
  async login(ctx: TcContext<{ appId: string; token: string }>) {
    const { appId, token } = ctx.params;

    const valid = await ctx.call('guyu.app.authToken', {
      appId,
      token,
      capability: ['bot'],
    });

    if (!valid) {
      throw new Error('Auth failed.');
    }

    const { userId, email, nickname, avatar } = await this.localCall(
      'getOrCreateBotAccount',
      { appId }
    );

    const jwt: string = await ctx.call('user.generateUserToken', {
      userId,
      email,
      nickname,
      avatar,
    });

    return { jwt, userId, email, nickname, avatar };
  }

  /**
   * 获取或创建机器人账号
   */
  async getOrCreateBotAccount(ctx: TcContext<{ appId: string }>): Promise<{
    userId: string;
    email: string;
    nickname: string;
    avatar: string;
  }> {
    const appId = ctx.params.appId;
    await this.waitForServices(['user']);

    const appInfo: GuyuApp = await ctx.call('guyu.app.get', { appId });

    try {
      const botId = 'guyu_' + appId;
      const nickname = appInfo.appName;
      const avatar = appInfo.appIcon;

      // ensurePluginBot 返回的是 string (userId)
      const botUserId: string = await ctx.call('user.ensurePluginBot', {
        botId,
        nickname,
        avatar,
      });

      this.logger.info('[getOrCreateBotAccount] Bot Id:', botUserId);

      return {
        userId: botUserId,
        email: `guyu_${appId}@plugin.msgbyte.com`,
        nickname,
        avatar,
      };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}

export default GuyuBotService;