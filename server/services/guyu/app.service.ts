/**
 * GuYu (谷雨) 应用管理服务
 * 参考 openapi/app.service.ts
 */

import {
  TcService,
  config,
  TcDbService,
  TcContext,
  EntityError,
  NoPermissionError,
} from 'tailchat-server-sdk';
import _ from 'lodash';
import {
  filterAvailableGuyuCapability,
  GuyuApp,
  GuyuAppBot,
  GuyuAppDocument,
  GuyuAppModel,
} from '../../models/guyu/guyu-app';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

interface GuyuAppService
  extends TcService,
    TcDbService<GuyuAppDocument, GuyuAppModel> {}

class GuyuAppService extends TcService {
  get serviceName(): string {
    return 'guyu.app';
  }

  onInit(): void {
    this.registerLocalDb(require('../../models/guyu/guyu-app').default);

    this.registerAction('authToken', this.authToken, {
      params: {
        appId: 'string',
        token: 'string',
        capability: { type: 'array', items: 'string', optional: true },
      },
      cache: {
        keys: ['appId', 'token'],
        ttl: 60 * 60,
      },
    });

    this.registerAction('all', this.all);
    this.registerAction('get', this.get, {
      params: { appId: 'string' },
      cache: {
        keys: ['appId'],
        ttl: 60 * 60,
      },
    });
    this.registerAction('create', this.create, {
      params: {
        appName: 'string',
        appDesc: 'string',
        appIcon: 'string',
      },
    });
    this.registerAction('delete', this.delete, {
      params: { appId: 'string' },
    });
    this.registerAction('setAppInfo', this.setAppInfo, {
      params: {
        appId: 'string',
        fieldName: 'string',
        fieldValue: 'string',
      },
    });
    this.registerAction('setAppCapability', this.setAppCapability, {
      params: {
        appId: 'string',
        capability: { type: 'array', items: 'string' },
      },
    });
    this.registerAction('setAppBotInfo', this.setAppBotInfo, {
      params: {
        appId: 'string',
        fieldName: 'string',
        fieldValue: 'any',
      },
    });
  }

  /**
   * 校验 Token
   */
  async authToken(
    ctx: TcContext<{
      appId: string;
      token: string;
      capability?: GuyuAppDocument['capability'];
    }>
  ): Promise<boolean> {
    const { appId, token, capability } = ctx.params;
    const app = await this.adapter.model.findOne({ appId });

    if (!app) {
      throw new Error('Not found guyu app: ' + appId);
    }

    if (Array.isArray(capability)) {
      for (const item of capability) {
        if (!app.capability.includes(item)) {
          throw new Error('Guyu app not enabled capability: ' + item);
        }
      }
    }

    const appSecret = app.appSecret;
    const expectedToken = crypto
      .createHash('md5')
      .update(appId + appSecret)
      .digest('hex');

    return token === expectedToken;
  }

  /**
   * 获取用户参与的所有应用
   */
  async all(ctx: TcContext<{}>) {
    const apps = await this.adapter.model.find({
      owner: ctx.meta.userId,
    });

    return this.transformDocuments(ctx, {}, apps);
  }

  /**
   * 获取应用信息
   */
  async get(ctx: TcContext<{ appId: string }>) {
    const { appId } = ctx.params;
    const app = await this.adapter.model.findOne(
      { appId },
      { appSecret: false } // 排除敏感字段
    );

    if (!app) {
      throw new EntityError('应用不存在');
    }

    return this.transformDocuments(ctx, {}, app);
  }

  /**
   * 创建应用
   */
  async create(
    ctx: TcContext<{
      appName: string;
      appDesc: string;
      appIcon: string;
    }>
  ) {
    const { appName, appDesc, appIcon } = ctx.params;
    const userId = ctx.meta.userId;

    if (!userId) {
      throw new NoPermissionError('需要登录');
    }

    const appId = 'guyu_' + nanoid(16);
    const appSecret = nanoid(32);

    const app = await this.adapter.model.create({
      appId,
      appSecret,
      appName,
      appDesc,
      appIcon,
      owner: new Types.ObjectId(userId),
      capability: [],
    });

    this.logger.info('✅ 创建谷雨应用:', appId);

    return this.transformDocuments(ctx, {}, app);
  }

  /**
   * 删除应用
   */
  async delete(ctx: TcContext<{ appId: string }>) {
    const { appId } = ctx.params;
    const userId = ctx.meta.userId;

    const app = await this.adapter.model.findOne({ appId });

    if (!app) {
      throw new EntityError('应用不存在');
    }

    if (String(app.owner) !== userId) {
      throw new NoPermissionError('没有权限删除该应用');
    }

    await this.adapter.model.deleteOne({ appId });

    return { success: true };
  }

  /**
   * 设置应用信息
   */
  async setAppInfo(
    ctx: TcContext<{
      appId: string;
      fieldName: string;
      fieldValue: string;
    }>
  ) {
    const { appId, fieldName, fieldValue } = ctx.params;

    const allowFields = ['appName', 'appDesc', 'appIcon'];
    if (!allowFields.includes(fieldName)) {
      throw new EntityError('不允许修改该字段');
    }

    const app = await this.adapter.model.findOneAndUpdate(
      { appId },
      { $set: { [fieldName]: fieldValue } },
      { new: true }
    );

    if (!app) {
      throw new EntityError('应用不存在');
    }

    return this.transformDocuments(ctx, {}, app);
  }

  /**
   * 设置应用能力
   */
  async setAppCapability(
    ctx: TcContext<{
      appId: string;
      capability: string[];
    }>
  ) {
    const { appId, capability } = ctx.params;

    const filtered = filterAvailableGuyuCapability(capability);

    const app = await this.adapter.model.findOneAndUpdate(
      { appId },
      { $set: { capability: filtered } },
      { new: true }
    );

    if (!app) {
      throw new EntityError('应用不存在');
    }

    return this.transformDocuments(ctx, {}, app);
  }

  /**
   * 设置应用 Bot 信息
   */
  async setAppBotInfo(
    ctx: TcContext<{
      appId: string;
      fieldName: string;
      fieldValue: any;
    }>
  ) {
    const { appId, fieldName, fieldValue } = ctx.params;

    const allowFields = ['callbackUrl'];
    if (!allowFields.includes(fieldName)) {
      throw new EntityError('不允许修改该字段');
    }

    const app = await this.adapter.model.findOneAndUpdate(
      { appId },
      { $set: { bot: { [fieldName]: fieldValue } } },
      { new: true }
    );

    if (!app) {
      throw new EntityError('应用不存在');
    }

    return this.transformDocuments(ctx, {}, app);
  }
}

export default GuyuAppService;