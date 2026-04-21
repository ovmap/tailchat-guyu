/**
 * 创建测试凭证脚本
 * 
 * 用于测试 GuYu WebSocket 连接
 */

const mongoose = require('mongoose');
const path = require('path');

// 配置
const config = {
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/tailchat',
  appId: 'cli_test_001',
  appSecret: 'test_secret_001',
  appName: 'OpenClaw Test Instance',
};

async function main() {
  console.log('🌧️  GuYu - 创建测试凭证\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 连接数据库
  console.log('📡 连接 MongoDB...');
  console.log(`   URL: ${config.mongoUrl}\n`);
  
  await mongoose.connect(config.mongoUrl);
  console.log('✅ 数据库连接成功\n');
  
  // 导入模型
  const AppCredential = require('../../models/app-credential').default;
  
  // 检查是否已存在
  const existing = await AppCredential.findOne({ appId: config.appId });
  if (existing) {
    console.log('⚠️  凭证已存在，更新中...\n');
    existing.appSecret = config.appSecret;
    existing.name = config.appName;
    existing.isActive = true;
    await existing.save();
    console.log('✅ 凭证已更新\n');
  } else {
    console.log('📝 创建新凭证...\n');
    await AppCredential.create({
      appId: config.appId,
      appSecret: config.appSecret,
      name: config.appName,
      description: 'Test credential for GuYu WebSocket',
      isActive: true,
    });
    console.log('✅ 凭证已创建\n');
  }
  
  // 显示凭证信息
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 测试凭证信息:\n');
  console.log(`   App ID:     ${config.appId}`);
  console.log(`   App Secret: ${config.appSecret}`);
  console.log(`   Name:       ${config.appName}\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔌 WebSocket 连接 URL:\n');
  console.log(`   ws://localhost:11000/v3/im/ws?app_id=${config.appId}&token=${config.appSecret}\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 使用方式:\n');
  console.log('   1. 启动 Tailchat: cd /home/leshines/program/nodejs/tailchat && pnpm dev');
  console.log('   2. 运行测试脚本: node test-ws.cjs');
  console.log('   3. 或使用 wscat: wscat -c "ws://localhost:11000/v3/im/ws?app_id=cli_test_001&token=test_secret_001"\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 断开连接
  await mongoose.disconnect();
  console.log('👋 数据库连接已关闭\n');
  
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
