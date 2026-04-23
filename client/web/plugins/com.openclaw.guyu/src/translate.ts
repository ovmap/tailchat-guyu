import { localTrans } from '@capital/common';

export const Translate = {
  guyuSettings: localTrans({ 'zh-CN': '谷雨配置', 'en-US': 'GuYu' }),
  guyuTitle: localTrans({ 'zh-CN': '🌧️ 谷雨配置', 'en-US': 'GuYu Configuration' }),
  guyuSubtitle: localTrans({ 
    'zh-CN': '谷雨时节 · 古语传情 - OpenClaw 桥接配置', 
    'en-US': 'GuYu - OpenClaw Bridge Configuration' 
  }),
  
  appName: localTrans({ 'zh-CN': '应用名称', 'en-US': 'App Name' }),
  appDesc: localTrans({ 'zh-CN': '描述', 'en-US': 'Description' }),
  
  createApp: localTrans({ 'zh-CN': '创建应用', 'en-US': 'Create App' }),
  enableBot: localTrans({ 'zh-CN': '启用 Bot', 'en-US': 'Enable Bot' }),
  configOpenClaw: localTrans({ 'zh-CN': '配置 OpenClaw', 'en-US': 'Config OpenClaw' }),
  
  appId: localTrans({ 'zh-CN': 'App ID', 'en-US': 'App ID' }),
  appSecret: localTrans({ 'zh-CN': 'App Secret', 'en-US': 'App Secret' }),
  
  createAppDesc: localTrans({ 'zh-CN': '点击按钮创建谷雨应用', 'en-US': 'Click button to create GuYu app' }),
  enableBotDesc: localTrans({ 'zh-CN': '启用机器人能力', 'en-US': 'Enable bot capability' }),
  configOpenClawDesc: localTrans({ 'zh-CN': '将凭证填写到 OpenClaw', 'en-US': 'Fill credentials to OpenClaw' }),
  
  copySecret: localTrans({ 'zh-CN': '复制密钥', 'en-US': 'Copy Secret' }),
  copiedToClipboard: localTrans({ 'zh-CN': '已复制到剪贴板', 'en-US': 'Copied to clipboard' }),
  
  appCreated: localTrans({ 'zh-CN': '应用创建成功', 'en-US': 'App created' }),
  botEnabled: localTrans({ 'zh-CN': 'Bot 已启用', 'en-US': 'Bot enabled' }),
  
  importantNotice: localTrans({ 'zh-CN': '⚠️ 重要提示', 'en-US': '⚠️ Important Notice' }),
  importantNoticeDesc: localTrans({ 
    'zh-CN': 'appSecret 只显示一次，请立即复制保存！', 
    'en-US': 'appSecret is shown only once, please copy and save it immediately!' 
  }),
};