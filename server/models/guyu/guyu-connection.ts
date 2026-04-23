import mongoose from 'mongoose';

/**
 * GuYu 连接记录
 * 用于管理 OpenClaw 与 Tailchat 的连接映射
 * 一个 appId 可以对应多个会话（一对多）
 */
const GuyuConnectionSchema = new mongoose.Schema({
  // OpenClaw 应用 ID
  appId: {
    type: String,
    required: true,
  },

  // 认证 Token (app_secret)
  token: {
    type: String,
    required: true,
  },

  // 关联的 Tailchat 用户 ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // 关联的会话 ID
  converseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Converse',
    required: true,
  },

  // 会话类型：dm(私信) | group(群组)
  chatType: {
    type: String,
    enum: ['dm', 'group'],
    required: true,
  },

  // 如果是群组，关联群组 ID
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
  },

  // 最后心跳时间
  lastHeartbeat: {
    type: Date,
    default: Date.now,
  },

  // 是否活跃
  isActive: {
    type: Boolean,
    default: true,
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 更新 updatedAt
GuyuConnectionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// 复合索引（appId + converseId）- 支持一对多
GuyuConnectionSchema.index({ appId: 1, converseId: 1 });
GuyuConnectionSchema.index({ userId: 1 });
GuyuConnectionSchema.index({ appId: 1, isActive: 1 });

export default mongoose.model('GuyuConnection', GuyuConnectionSchema);
