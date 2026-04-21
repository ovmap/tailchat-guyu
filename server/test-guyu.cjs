/**
 * GuYu (谷雨) 插件测试脚本
 * 
 * 测试插件的 API Actions
 */

const { ServiceBroker } = require('moleculer');

async function testGuYu() {
  console.log('🌧️  开始测试 GuYu (谷雨) 插件...\n');

  // 创建 broker 连接到现有的 Tailchat 网络
  const broker = new ServiceBroker({
    nodeID: 'guyu-tester',
    transporter: 'redis://:8tuWqoi33s4kvTHm@43.248.79.29:16315/',
    logger: console,
    logLevel: 'warn',
  });

  try {
    // 启动 broker
    await broker.start();
    console.log('✅ 测试器已连接到 Tailchat 网络\n');

    // 等待 GuYu 服务可用
    console.log('⏳ 等待 GuYu 服务...');
    await broker.waitForServices('plugin:com.openclaw.guyu', 10000);
    console.log('✅ GuYu 服务已就绪\n');

    // 测试 1: 发送消息
    console.log('📤 测试 1: 发送消息');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const result = await broker.call('plugin:com.openclaw.guyu.sendMessage', {
        chat_type: 'p2p',
        receive_id: 'test_user_001',
        content: JSON.stringify({ text: '你好，这是 GuYu 测试消息！' }),
        message_type: 'text',
      });
      console.log('✅ 发送成功:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ 发送失败:', error.message);
    }
    console.log('');

    // 测试 2: 获取消息
    console.log('📥 测试 2: 获取消息');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      // 这里需要一个真实的消息 ID
      const result = await broker.call('plugin:com.openclaw.guyu.getMessage', {
        messageId: 'test_message_id',
      });
      console.log('✅ 获取成功:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('⚠️  获取失败 (预期):', error.message);
    }
    console.log('');

    // 测试 3: 获取会话列表
    console.log('💬 测试 3: 获取会话列表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const result = await broker.call('plugin:com.openclaw.guyu.getChats', {
        userId: 'test_user_id',
      });
      console.log('✅ 获取成功:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('⚠️  获取失败 (预期):', error.message);
    }
    console.log('');

    // 列出所有已注册的服务
    console.log('📋 所有已注册的服务:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const services = await broker.getLocalNodeInfo().services;
    const guyuServices = services.filter(s => 
      s.name && s.name.includes('guyu')
    );
    guyuServices.forEach(service => {
      console.log(`  - ${service.name}`);
      if (service.actions) {
        Object.keys(service.actions).forEach(action => {
          console.log(`    • ${action}`);
        });
      }
    });
    console.log('');

    console.log('🎉 测试完成！\n');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 关闭 broker
    await broker.stop();
    console.log('👋 测试器已断开连接');
    process.exit(0);
  }
}

// 运行测试
testGuYu();
