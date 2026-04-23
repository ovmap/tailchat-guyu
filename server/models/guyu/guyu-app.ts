import {
  getModelForClass,
  prop,
  DocumentType,
  index,
  ReturnModelType,
  Ref,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import type { Types } from 'mongoose';
import { User } from '../user/user';

const guyuAppCapability = [
  'bot', // 机器人
] as const;

type GuyuAppCapability = typeof guyuAppCapability[number];

/**
 * 确保输出类型为应用能力
 */
export function filterAvailableGuyuCapability(
  input: string[]
): GuyuAppCapability[] {
  return input.filter((item) =>
    guyuAppCapability.includes(item as GuyuAppCapability)
  ) as GuyuAppCapability[];
}

export interface GuyuAppBot {
  callbackUrl: string;
}

/**
 * 谷雨应用 - 参考 OpenApp
 */
@index({ appId: 1 }, { unique: true })
export class GuyuApp extends TimeStamps implements Base {
  _id: Types.ObjectId;
  id: string;

  @prop({
    ref: () => User,
  })
  owner: Ref<User>;

  @prop()
  appId: string;

  @prop()
  appSecret: string;

  @prop()
  appName: string;

  @prop()
  appDesc: string;

  @prop()
  appIcon: string;

  @prop({
    enum: guyuAppCapability,
    type: () => String,
  })
  capability: GuyuAppCapability[];

  @prop()
  bot?: GuyuAppBot;

  static async findAppByIdAndOwner(
    this: ReturnModelType<typeof GuyuApp>,
    appId: string,
    ownerId: string
  ) {
    const res = await this.findOne({
      appId,
      owner: ownerId,
    }).exec();

    return res;
  }
}

export type GuyuAppDocument = DocumentType<GuyuApp>;

const model = getModelForClass(GuyuApp);

export type GuyuAppModel = typeof model;

export default model;