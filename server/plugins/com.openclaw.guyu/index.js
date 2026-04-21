/**
 * GuYu (谷雨) 插件入口
 *
 * 连接 OpenClaw 与 Tailchat 的智能桥接插件
 *
 * @author 陆小千
 * @version 1.0.0
 */

module.exports = {
  // 插件元信息
  name: 'com.openclaw.guyu',
  version: '1.0.0',
  description: 'GuYu (谷雨) - AI 助手桥接插件，连接 OpenClaw 与 Tailchat',
  author: '陆小千',
  license: 'MIT',

  // 插件服务
  services: [
    // API 服务 - Tailchat 内部 action
    require('./services/guyu-api.service').default,

    // HTTP 服务 - 独立 HTTP 服务器 (3080端口)
    require('./services/guyu-http-routes.service').default,
  ],

  // 插件依赖
  dependencies: ['chat.message', 'chat.converse', 'user'],

  // 插件配置
  settings: {
    // HTTP 服务端口
    httpPort: 3080,

    // WebSocket 心跳间隔 (毫秒)
    heartbeatInterval: 30000,

    // 连接超时时间 (毫秒)
    connectionTimeout: 90000,

    // 是否启用调试日志
    debug: true,
  },

  // 插件方法
  methods: {
    /**
     * 插件初始化
     */
    created() {
      this.logger.info('🌱 GuYu (谷雨) 插件已加载');
      this.logger.info('📝 版本:', this.settings.version);
      this.logger.info('👤 作者:', this.settings.author);
    },

    /**
     * 插件启动
     */
    started() {
      this.logger.info('✅ GuYu (谷雨) 插件已启动');
      this.logger.info('🌧️ 雨生百谷 · 古语传情');
    },

    /**
     * 插件停止
     */
    stopped() {
      this.logger.info('👋 GuYu (谷雨) 插件已停止');
    },
  },
};
