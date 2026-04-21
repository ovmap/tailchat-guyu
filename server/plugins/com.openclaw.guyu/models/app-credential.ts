import mongoose from 'mongoose';

/**
 * OpenClaw 应用凭证
 * 存储 app_id 和 app_secret，用于 WebSocket 连接认证
 */
const AppCredentialSchema = new mongoose.Schema({
  // 应用 ID (cli_xxx)
  appId: {
    type: String,
    required: true,
    unique: true,
  },

  // 应用密钥
  appSecret: {
    type: String,
    required: true,
  },

  // 应用名称
  name: {
    type: String,
    default: 'OpenClaw Instance',
  },

  // 描述
  description: {
    type: String,
    default: '',
  },

  // 关联的 Tailchat 用户 ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // 默认会话 ID
  converseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Converse',
  },

  // 是否活跃
  isActive: {
    type: Boolean,
    default: true,
  },

  // 最后心跳时间
  lastHeartbeat: {
    type: Date,
    default: Date.now,
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
AppCredentialSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// 索引优化
AppCredentialSchema.index({ appId: 1 });
AppCredentialSchema.index({ userId: 1 });

export default mongoose.model('AppCredential', AppCredentialSchema);
