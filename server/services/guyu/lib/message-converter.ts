/**
 * GuYu 消息格式转换器
 *
 * OpenClaw (飞书协议) ←→ Tailchat 消息格式
 */

/**
 * OpenClaw 消息内容 → Tailchat 消息内容
 */
export function convertToTailchatContent(ocContent: string, type: string) {
  try {
    switch (type) {
      case 'text': {
        const parsed = JSON.parse(ocContent);
        return {
          type: 'text',
          content: parsed.text || ocContent,
        };
      }

      case 'post': {
        const parsed = JSON.parse(ocContent);
        return convertPostToRich(parsed);
      }

      case 'image': {
        const parsed = JSON.parse(ocContent);
        return {
          type: 'image',
          content: parsed.image_key || parsed.url,
        };
      }

      default:
        return {
          type: 'text',
          content:
            typeof ocContent === 'string'
              ? ocContent
              : JSON.stringify(ocContent),
        };
    }
  } catch (error) {
    // 解析失败，当作普通文本
    return {
      type: 'text',
      content: String(ocContent),
    };
  }
}

/**
 * Tailchat 消息内容 → OpenClaw 消息内容
 */
export function convertToOpenClawContent(tailchatContent: any) {
  const { type, content } = tailchatContent;

  switch (type) {
    case 'text':
      return JSON.stringify({
        text: content,
      });

    case 'rich':
      return convertRichToPost(content);

    case 'image':
      return JSON.stringify({
        image_key: content,
        url: content,
      });

    default:
      return JSON.stringify({
        text: String(content),
      });
  }
}

/**
 * 将飞书 Post 格式转换为 Tailchat Rich 格式
 */
function convertPostToRich(postContent: any) {
  // 简化处理，实际需要根据飞书 post 格式详细转换
  const title = postContent.title?.zh_cn || postContent.title || '';
  const content =
    postContent.content
      ?.map((section: any) => {
        return section
          .map((item: any) => {
            switch (item.tag) {
              case 'text':
                return { type: 'text', text: item.text };
              case 'a':
                return { type: 'link', text: item.text, url: item.href };
              case 'at':
                return {
                  type: 'mention',
                  userId: item.user_id,
                  text: item.text,
                };
              case 'img':
                return { type: 'image', imageKey: item.image_key };
              default:
                return { type: 'text', text: item.text || '' };
            }
          })
          .flat();
      })
      .flat() || [];

  return {
    type: 'rich',
    title,
    content,
  };
}

/**
 * 将 Tailchat Rich 格式转换为飞书 Post 格式
 */
function convertRichToPost(richContent: any) {
  const content =
    richContent.content?.map((item: any) => {
      switch (item.type) {
        case 'text':
          return [{ tag: 'text', text: item.text }];
        case 'link':
          return [{ tag: 'a', text: item.text, href: item.url }];
        case 'mention':
          return [{ tag: 'at', text: item.text, user_id: item.userId }];
        case 'image':
          return [{ tag: 'img', image_key: item.imageKey }];
        default:
          return [{ tag: 'text', text: item.text || '' }];
      }
    }) || [];

  return JSON.stringify({
    title: {
      zh_cn: richContent.title || '',
    },
    content,
  });
}

/**
 * 生成事件 ID
 */
function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 飞书 API 支持的消息类型
 * @see https://open.feishu.cn/document/server-docs/im-v1/message/create
 */
const FEISHU_MESSAGE_TYPES = [
  'text',
  'image',
  'file',
  'audio',
  'media',
  'sticker',
  'interactive',
  'share_chat',
  'share_user',
] as const;

type FeishuMessageType = typeof FEISHU_MESSAGE_TYPES[number];

/**
 * 将 Tailchat 消息类型映射为飞书支持的消息类型
 */
function normalizeMessageType(type: string | undefined): FeishuMessageType {
  if (!type) return 'text';
  
  // 直接支持的类型
  if (FEISHU_MESSAGE_TYPES.includes(type as FeishuMessageType)) {
    return type as FeishuMessageType;
  }
  
  // Tailchat 类型映射
  const typeMap: Record<string, FeishuMessageType> = {
    'rich': 'interactive',  // Tailchat 富文本 → 飞书交互卡片
    'video': 'media',       // 视频 → 媒体消息
    'emoji': 'sticker',     // 表情 → 贴纸
  };
  
  return typeMap[type] || 'text';  // 未知类型降级为 text
}

/**
 * Tailchat 事件 → OpenClaw (飞书) 事件格式
 * 参考 openclaw-back 的 pushMessageEvent 实现
 * 确保与 demo 项目完全兼容
 */
export function convertToOpenClawEvent(tailchatEvent: any) {
  // ✅ 确保 content 是字符串（与 openclaw-back 一致）
  const contentStr = typeof tailchatEvent.content === 'string'
    ? tailchatEvent.content
    : JSON.stringify(tailchatEvent.content || { text: '' });

  // ✅ 规范化 chat_type（飞书 SDK 要求 'p2p' 或 'group'）
  let normalizedChatType = 'group';
  if (tailchatEvent.chatType === 'dm' || tailchatEvent.chatType === 'p2p' || tailchatEvent.chatType === 'private') {
    normalizedChatType = 'p2p';
  }

  // ✅ 生成时间戳（飞书要求 13 位毫秒时间戳字符串）
  const createTimeMs = tailchatEvent.createdAt
    ? (tailchatEvent.createdAt instanceof Date
        ? tailchatEvent.createdAt.getTime().toString()
        : String(tailchatEvent.createdAt))
    : Date.now().toString();

  // ✅ 生成事件 ID
  const eventId = generateEventId();

  // ✅ 规范化 message_type（映射为飞书支持的类型）
  const messageType = normalizeMessageType(tailchatEvent.messageType);

  // ✅ 构造与 openclaw-back 完全一致的事件格式
  return {
    header: {
      event_id: eventId,
      event_type: 'im.message.receive_v1',
      token: 'mock_token',
      app_id: '',  // 会在 pushMessage 中填充
      tenant_key: 'tenant_mock',
      ts: Math.floor(Date.now() / 1000).toString(),
    },
    event: {
      sender: {
        sender_id: {
          open_id: tailchatEvent.author,
        },
        sender_type: 'user',
      },
      message: {
        message_id: tailchatEvent.messageId,
        root_id: tailchatEvent.rootId || '',          // ✅ 添加 root_id（回复消息时使用）
        parent_id: tailchatEvent.parentId || '',      // ✅ 添加 parent_id（回复消息时使用）
        chat_id: tailchatEvent.converseId || tailchatEvent.groupId || '',
        chat_type: normalizedChatType,
        message_type: messageType,
        content: contentStr,
        create_time: createTimeMs,
        mentions: tailchatEvent.mentions || [],       // ✅ 添加 mentions（群组@信息）
        _groupId: tailchatEvent.groupId || '',        // ✅ 添加原始 groupId，回复时使用
      },
    },
  };
}

/**
 * OpenClaw (飞书) 事件 → Tailchat 事件格式
 */
export function convertToTailchatEvent(ocEvent: any) {
  const { event } = ocEvent;
  const { message } = event;

  return {
    messageId: message.message_id,
    rootId: message.root_id,
    parentId: message.parent_id,
    createdAt: new Date(message.create_time),
    chatType: message.chat_type === 'p2p' ? 'dm' : 'group',
    messageType: message.message_type,
    content: convertToTailchatContent(message.content, message.message_type),
    author: event.sender?.sender_id?.union_id,
    converseId: message.chat_id,
    groupId: message.chat_type === 'group' ? message.chat_id : undefined,
  };
}
