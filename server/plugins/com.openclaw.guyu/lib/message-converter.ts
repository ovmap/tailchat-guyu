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
 * Tailchat 事件 → OpenClaw (飞书) 事件格式
 */
export function convertToOpenClawEvent(tailchatEvent: any) {
  return {
    header: {
      msg_type: 'im.message.receive.v1',
      event_type: 'im.message.receive_v1',
      event_id: generateEventId(),
      create_time: new Date().toISOString(),
    },
    event: {
      message: {
        message_id: tailchatEvent.messageId,
        root_id: tailchatEvent.messageId,
        parent_id: tailchatEvent.parentId || null,
        create_time:
          tailchatEvent.createdAt?.toISOString() || new Date().toISOString(),
        chat_type: tailchatEvent.chatType === 'dm' ? 'p2p' : 'group',
        message_type: 'text',
        content: convertToOpenClawContent(tailchatEvent.content),
        mentions: tailchatEvent.mentions || [],
      },
      sender: {
        sender_id: {
          union_id: tailchatEvent.author,
        },
        sender_type: 'user',
        tenant_key: 'default',
      },
    },
  };
}

/**
 * 生成事件 ID
 */
function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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
