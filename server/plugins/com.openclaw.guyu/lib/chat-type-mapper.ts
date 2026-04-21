/**
 * 会话类型映射
 *
 * OpenClaw: p2p (个人) | group (群组)
 * Tailchat: dm (私信) | group (群组)
 */

export const chatTypeMap = {
  // OpenClaw → Tailchat
  oc2tailchat: {
    p2p: 'dm',
    group: 'group',
  },

  // Tailchat → OpenClaw
  tailchat2oc: {
    dm: 'p2p',
    group: 'group',
  },
};

/**
 * 映射会话类型
 */
export function mapChatType(
  type: string,
  direction: 'oc2tailchat' | 'tailchat2oc'
) {
  return (
    chatTypeMap[direction][
      type as keyof (typeof chatTypeMap)[typeof direction]
    ] || type
  );
}

/**
 * 验证会话类型是否有效
 */
export function isValidChatType(
  type: string,
  direction: 'oc2tailchat' | 'tailchat2oc'
): boolean {
  return type in chatTypeMap[direction];
}

/**
 * 获取所有支持的会话类型
 */
export function getSupportedTypes(
  direction: 'oc2tailchat' | 'tailchat2oc'
): string[] {
  return Object.keys(chatTypeMap[direction]);
}
