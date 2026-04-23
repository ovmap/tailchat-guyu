import { call, DataNotFoundError, TcContext } from 'tailchat-server-sdk';
import { TcService } from 'tailchat-server-sdk';
import { isValidStr } from '../../lib/utils';
import type { GuyuApp } from '../../models/guyu/guyu-app';

/**
 * 谷雨第三方应用集成
 */
class GuyuIntegrationService extends TcService {
  get serviceName(): string {
    return 'guyu.integration';
  }

  onInit(): void {
    this.registerAction('addBotUser', this.addBotUser, {
      params: {
        appId: 'string',
        groupId: 'string',
      },
    });
  }

  /**
   * 在群组中添加机器人用户
   */
  async addBotUser(
    ctx: TcContext<{
      appId: string;
      groupId: string;
    }>
  ) {
    const appId = ctx.params.appId;
    const groupId = ctx.params.groupId;
    const t = ctx.meta.t;

    const guyuApp: GuyuApp = await ctx.call('guyu.app.get', {
      appId,
    });

    if (!guyuApp) {
      throw new DataNotFoundError(t('应用未找到'));
    }

    if (!guyuApp.capability.includes('bot')) {
      throw new Error(t('该应用的机器人服务尚未开通'));
    }

    const botAccount: any = await ctx.call(
      'guyu.bot.getOrCreateBotAccount',
      {
        appId,
      }
    );

    const userId = botAccount.userId;
    this.logger.info('[guyu.integration] Bot Account:', {
      userId,
      email: botAccount.email,
      nickname: botAccount.nickname,
    });

    if (!isValidStr(userId)) {
      throw new Error(t('无法获取到机器人ID'));
    }

    await ctx.call(
      'group.joinGroup',
      {
        groupId,
      },
      {
        meta: {
          userId,
        },
      }
    );

    await call(ctx).addGroupSystemMessage(
      String(groupId),
      `${ctx.meta.user.nickname} 在群组中添加了机器人 ${botAccount.nickname}`
    );
  }
}

export default GuyuIntegrationService;
