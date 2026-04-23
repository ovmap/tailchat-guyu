import mongoose from 'mongoose';

/**
 * 消息 ID 映射表
 * 用于 GuYu 消息与 Tailchat 消息的双向转换
 */
const MessageMappingSchema = new mongoose.Schema({
  // GuYu/OpenClaw 消息 ID
  guyuMessageId: {
    type: String,
    required: true,
    unique: true,
  },

  // Tailchat 消息 ID
  tailchatMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
  },

  // 关联的会话 ID
  converseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Converse',
  },

  // 消息方向：in(接收) | out(发送)
  direction: {
    type: String,
    enum: ['in', 'out'],
    default: 'out',
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 索引优化
MessageMappingSchema.index({ guyuMessageId: 1 });
MessageMappingSchema.index({ tailchatMessageId: 1 });
MessageMappingSchema.index({ converseId: 1 });

export default mongoose.model('MessageMapping', MessageMappingSchema);
